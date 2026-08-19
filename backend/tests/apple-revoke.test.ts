import { generateKeyPairSync } from 'node:crypto';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

// Sign in with Apple token revocation on account deletion (TN3194, Part 1 row
// 1.4.13, Part 2 row 2.3.4).
//
// The real credentials do not exist in this environment and must not: the .p8
// is a production secret. Everything here is therefore driven by a P-256 key
// generated in-process, which is the same shape of key Apple issues, so the
// client secret this code builds is verified against a public key the test
// owns rather than merely eyeballed. What is NOT covered by construction:
// whether Apple accepts a secret signed by the real key with the real team id.
// That is one live call at deploy time, not something a test can assert.

const APPLE = 'https://appleid.apple.com';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const TEST_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const TEST_PUBLIC = publicKey;

const TEST_TEAM_ID = 'TEAMID1234';
const TEST_KEY_ID = 'KEYID56789';

type SavedConfig = { team: string; key: string; pem: string };

function form(body: unknown): URLSearchParams {
  return new URLSearchParams(String(body));
}

async function seedStoredRefreshToken(token: string): Promise<void> {
  const { setAppleRefreshToken } = await import('../src/store/users.js');
  await setAppleRefreshToken(testUserId, token);
}

describe('apple grant revocation', () => {
  let originalDispatcher: Dispatcher;
  let mockAgent: MockAgent;
  let saved: SavedConfig;

  beforeEach(async () => {
    await resetDatabase();
    saved = {
      team: config.APPLE_TEAM_ID,
      key: config.APPLE_SIGN_IN_KEY_ID,
      pem: config.APPLE_SIGN_IN_PRIVATE_KEY,
    };
    config.APPLE_TEAM_ID = TEST_TEAM_ID;
    config.APPLE_SIGN_IN_KEY_ID = TEST_KEY_ID;
    config.APPLE_SIGN_IN_PRIVATE_KEY = TEST_PEM;

    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher);
    config.APPLE_TEAM_ID = saved.team;
    config.APPLE_SIGN_IN_KEY_ID = saved.key;
    config.APPLE_SIGN_IN_PRIVATE_KEY = saved.pem;
  });

  it('revokes the stored refresh token when the account is deleted', async () => {
    await seedStoredRefreshToken('apple-refresh-1');

    let sent: URLSearchParams | null = null;
    mockAgent
      .get(APPLE)
      .intercept({ path: '/auth/revoke', method: 'POST' })
      .reply(200, (opts) => {
        sent = form(opts.body);
        return '';
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const body = sent as unknown as URLSearchParams;
    expect(body.get('token')).toBe('apple-refresh-1');
    expect(body.get('token_type_hint')).toBe('refresh_token');
    expect(body.get('client_id')).toBe(config.APPLE_BUNDLE_ID);

    await app.close();
  });

  // The client secret is the part that is easiest to get subtly wrong and
  // impossible to notice without the real credentials, so it is asserted claim
  // by claim against Apple's documented requirements rather than by shape.
  it('authenticates with an ES256 client secret carrying the documented claims', async () => {
    await seedStoredRefreshToken('apple-refresh-2');

    let secret = '';
    mockAgent
      .get(APPLE)
      .intercept({ path: '/auth/revoke', method: 'POST' })
      .reply(200, (opts) => {
        secret = form(opts.body).get('client_secret') ?? '';
        return '';
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    await app.close();

    expect(decodeProtectedHeader(secret)).toMatchObject({ alg: 'ES256', kid: TEST_KEY_ID });

    const { payload } = await jwtVerify(secret, TEST_PUBLIC, {
      issuer: TEST_TEAM_ID,
      audience: APPLE,
    });
    expect(payload.sub).toBe(config.APPLE_BUNDLE_ID);
    expect(payload.exp).toBeGreaterThan(payload.iat as number);
  });

  // The posture the whole revoke module is built on: a provider outage cannot
  // be the reason a right-to-delete request fails.
  it('still deletes the account when Apple rejects the revoke', async () => {
    await seedStoredRefreshToken('apple-refresh-3');

    mockAgent.get(APPLE).intercept({ path: '/auth/revoke', method: 'POST' }).reply(400, { error: 'invalid_grant' });

    const { buildApp } = await import('../src/server.js');
    const { getUserById } = await import('../src/store/users.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(await getUserById(testUserId)).toBeNull();

    await app.close();
  });

  // disableNetConnect is doing the assertion here: if the code attempted the
  // call without credentials, undici would throw rather than the test passing.
  it('skips the call and still deletes when the Apple credentials are absent', async () => {
    await seedStoredRefreshToken('apple-refresh-4');
    config.APPLE_SIGN_IN_PRIVATE_KEY = '';

    const { buildApp } = await import('../src/server.js');
    const { getUserById } = await import('../src/store/users.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(await getUserById(testUserId)).toBeNull();

    await app.close();
  });

  it('reports not_configured rather than success when the credentials are absent', async () => {
    config.APPLE_TEAM_ID = '';

    const { revokeApple } = await import('../src/revoke/upstream.js');
    const log = { warn: () => {}, info: () => {} } as never;

    expect(await revokeApple(testUserId, log)).toEqual({ provider: 'apple', result: 'not_configured' });
  });

  // A user who signed in before the authorization code was collected. Reporting
  // this as `revoked` would be the same lie the row is about.
  it('reports no_token when no refresh token is held and no code is supplied', async () => {
    const { revokeApple } = await import('../src/revoke/upstream.js');
    const log = { warn: () => {}, info: () => {} } as never;

    expect(await revokeApple(testUserId, log)).toEqual({ provider: 'apple', result: 'no_token' });
  });

  it('reports no_connection for a Google-only account', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { revokeApple } = await import('../src/revoke/upstream.js');
    const googleUserId = await findOrCreateUser({ googleSub: 'google-only-sub' });
    const log = { warn: () => {}, info: () => {} } as never;

    expect(await revokeApple(googleUserId, log)).toEqual({ provider: 'apple', result: 'no_connection' });
  });

  // TN3194's answer to "you hold no usable token": collect a fresh
  // authorization code and exchange it. The exchanged token, not the stored
  // one, is what gets revoked.
  it('exchanges a fresh authorization code supplied with the deletion request', async () => {
    const pool = mockAgent.get(APPLE);
    let exchanged: URLSearchParams | null = null;
    pool.intercept({ path: '/auth/token', method: 'POST' }).reply(200, (opts) => {
      exchanged = form(opts.body);
      return { access_token: 'a', refresh_token: 'fresh-refresh', token_type: 'Bearer', expires_in: 3600 };
    });

    let revokedToken = '';
    pool.intercept({ path: '/auth/revoke', method: 'POST' }).reply(200, (opts) => {
      revokedToken = form(opts.body).get('token') ?? '';
      return '';
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/account',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ apple_authorization_code: 'code-from-device' }),
    });
    expect(res.statusCode).toBe(204);

    const sent = exchanged as unknown as URLSearchParams;
    expect(sent.get('code')).toBe('code-from-device');
    expect(sent.get('grant_type')).toBe('authorization_code');
    expect(revokedToken).toBe('fresh-refresh');

    await app.close();
  });

  // A spent or expired code is the common case, not an error case: the codes
  // are single-use and live five minutes.
  it('falls back to the stored token when the supplied code is already spent', async () => {
    await seedStoredRefreshToken('apple-refresh-5');

    const pool = mockAgent.get(APPLE);
    pool.intercept({ path: '/auth/token', method: 'POST' }).reply(400, { error: 'invalid_grant' });

    let revokedToken = '';
    pool.intercept({ path: '/auth/revoke', method: 'POST' }).reply(200, (opts) => {
      revokedToken = form(opts.body).get('token') ?? '';
      return '';
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/account',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ apple_authorization_code: 'stale-code' }),
    });
    expect(res.statusCode).toBe(204);
    expect(revokedToken).toBe('apple-refresh-5');

    await app.close();
  });

  it('stores the refresh token through the encryption envelope and reads it back', async () => {
    const { db } = await import('../src/db/client.js');
    const { users } = await import('../src/db/schema.js');
    const { eq } = await import('drizzle-orm');
    const { getAppleGrant, setAppleRefreshToken } = await import('../src/store/users.js');
    const { isEncrypted } = await import('../src/util/crypto.js');

    await setAppleRefreshToken(testUserId, 'round-trip-token');
    expect((await getAppleGrant(testUserId)).refreshToken).toBe('round-trip-token');

    // The column holds what encryptString produced, not the plaintext the
    // caller passed. In an environment with no DATA_ENCRYPTION_KEY those are
    // the same string by design (util/crypto passes through in dev and test),
    // which is why this compares against encryptString rather than asserting
    // ciphertext outright.
    const [row] = await db().select({ stored: users.appleRefreshToken }).from(users).where(eq(users.id, testUserId));
    expect(row?.stored).not.toBe('round-trip-token');
    expect(isEncrypted(row?.stored ?? '')).toBe(true);
  });

  // The generic user accessor must not carry a credential around.
  it('never returns the refresh token through getUserById', async () => {
    const { getUserById, setAppleRefreshToken } = await import('../src/store/users.js');
    await setAppleRefreshToken(testUserId, 'must-not-leak');

    const user = await getUserById(testUserId);
    expect(user?.appleRefreshToken).toBeNull();
  });
});

describe('apple authorization code exchange at sign-in', () => {
  let originalDispatcher: Dispatcher;
  let mockAgent: MockAgent;
  let saved: SavedConfig;

  beforeEach(async () => {
    await resetDatabase();
    saved = {
      team: config.APPLE_TEAM_ID,
      key: config.APPLE_SIGN_IN_KEY_ID,
      pem: config.APPLE_SIGN_IN_PRIVATE_KEY,
    };
    config.APPLE_TEAM_ID = TEST_TEAM_ID;
    config.APPLE_SIGN_IN_KEY_ID = TEST_KEY_ID;
    config.APPLE_SIGN_IN_PRIVATE_KEY = TEST_PEM;

    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher);
    config.APPLE_TEAM_ID = saved.team;
    config.APPLE_SIGN_IN_KEY_ID = saved.key;
    config.APPLE_SIGN_IN_PRIVATE_KEY = saved.pem;
  });

  it('returns the refresh token from a successful exchange', async () => {
    mockAgent
      .get(APPLE)
      .intercept({ path: '/auth/token', method: 'POST' })
      .reply(200, { access_token: 'a', refresh_token: 'r', token_type: 'Bearer', expires_in: 3600 });

    const { exchangeAuthorizationCode } = await import('../src/apple/client.js');
    expect(await exchangeAuthorizationCode('code')).toBe('r');
  });

  // Apple returns 200 with no refresh_token for some grant shapes. Null is the
  // honest answer; an empty string written to the column would look like a
  // token we could revoke with.
  it('returns null when Apple issues no refresh token', async () => {
    mockAgent
      .get(APPLE)
      .intercept({ path: '/auth/token', method: 'POST' })
      .reply(200, { access_token: 'a', token_type: 'Bearer', expires_in: 3600 });

    const { exchangeAuthorizationCode } = await import('../src/apple/client.js');
    expect(await exchangeAuthorizationCode('code')).toBeNull();
  });

  it('surfaces the error code Apple returned rather than a generic failure', async () => {
    mockAgent.get(APPLE).intercept({ path: '/auth/token', method: 'POST' }).reply(400, { error: 'invalid_client' });

    const { exchangeAuthorizationCode } = await import('../src/apple/client.js');
    await expect(exchangeAuthorizationCode('code')).rejects.toThrow('invalid_client');
  });

  // The route must keep working for the shipped build, which sends no code.
  it('signs in unchanged when no authorization code is sent', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/apple',
      payload: { identity_token: 'not.a.real.jwt', user_id: 'sub' },
    });
    // 401 because the identity token is not real; the point is that the schema
    // accepted a body with no authorization_code and got as far as verifying.
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});
