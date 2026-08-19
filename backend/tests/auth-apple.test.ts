import { webcrypto } from 'node:crypto';
import { exportJWK, type JWK, SignJWT } from 'jose';
import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase } from './db-helper.js';

// Tests over api/auth.ts, the file audit 1.4.14 records as untested: "every
// VERIFIED row from 1.4.1 to 1.4.8 rests on today's source and nothing stops
// tomorrow's edit".
//
// Apple's JWKS is served through undici's MockAgent rather than stubbed at the
// module boundary, so `createRemoteJWKSet` runs for real and the assertions are
// about the verifier's actual behaviour instead of about a fake.

const BUNDLE_ID = 'app.coiny.test';
const APPLE_ISSUER = 'https://appleid.apple.com';
const TEST_KID = 'apple-test-kid';

type Key = Parameters<typeof SignJWT.prototype.sign>[0];
let privateKey: Key;
let publicKey: Key;
let publicJwk: JWK & Record<string, unknown>;
let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(async () => {
  const keypair = (await webcrypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as { privateKey: unknown; publicKey: unknown };
  privateKey = keypair.privateKey as Key;
  publicKey = keypair.publicKey as Key;
  // biome-ignore lint/suspicious/noExplicitAny: exportJWK wants a CryptoKey, which is not typed to accept unknown
  publicJwk = (await exportJWK(keypair.publicKey as any)) as JWK & Record<string, unknown>;
  publicJwk.kid = TEST_KID;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
});

beforeEach(async () => {
  await resetDatabase();
  vi.resetModules();

  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);

  // The JWKS is fetched once per key id and cached, and vi.resetModules above
  // gives each test a fresh cache, so this is served persistently rather than
  // once.
  mockAgent
    .get(APPLE_ISSUER)
    .intercept({ path: '/auth/keys', method: 'GET' })
    .reply(200, { keys: [publicJwk] })
    .persist();
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

/** A well-formed Apple identity token, with individual claims overridable so a
 *  test can break exactly one thing at a time. */
async function appleToken(
  overrides: { sub?: string; issuer?: string; audience?: string; expiresIn?: string } = {},
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
    .setSubject(overrides.sub ?? 'apple_sub_valid')
    .setIssuer(overrides.issuer ?? APPLE_ISSUER)
    .setAudience(overrides.audience ?? BUNDLE_ID)
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '5m')
    .sign(privateKey);
}

async function post(payload: object) {
  const { buildApp } = await import('../src/server.js');
  const app = await buildApp();
  const res = await app.inject({ method: 'POST', url: '/api/auth/apple', payload });
  await app.close();
  return res;
}

describe('POST /api/auth/apple', () => {
  it('mints a session for a valid identity token', async () => {
    const token = await appleToken();

    const res = await post({ identity_token: token, user_id: 'apple_sub_valid' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ token: string; user_id: string }>();
    expect(body.token).toBeTruthy();
    expect(body.user_id).toBeTruthy();
  });

  it('returns the same user on a second sign-in rather than creating another', async () => {
    const first = await post({ identity_token: await appleToken(), user_id: 'apple_sub_valid' });
    const second = await post({ identity_token: await appleToken(), user_id: 'apple_sub_valid' });

    expect(first.json<{ user_id: string }>().user_id).toBe(second.json<{ user_id: string }>().user_id);
  });

  it('returns 400 when identity_token is missing', async () => {
    expect((await post({ user_id: 'apple_sub_valid' })).statusCode).toBe(400);
  });

  it('returns 401 for a token that is not a JWT at all', async () => {
    const res = await post({ identity_token: 'not.a.jwt', user_id: 'apple_sub_valid' });
    expect(res.statusCode).toBe(401);
  });

  // The cross-check: the client tells us who it thinks signed in, and the
  // token says who actually did. Trusting the client's copy would let any
  // valid Apple token be presented as any other account.
  it('returns 401 when the client-supplied user_id does not match the token sub', async () => {
    const token = await appleToken({ sub: 'apple_sub_real' });

    const res = await post({ identity_token: token, user_id: 'apple_sub_someone_else' });

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a token issued to a different bundle id', async () => {
    const token = await appleToken({ audience: 'com.someone.else' });

    expect((await post({ identity_token: token, user_id: 'apple_sub_valid' })).statusCode).toBe(401);
  });

  it('returns 401 for a token from a different issuer', async () => {
    const token = await appleToken({ issuer: 'https://evil.example.com' });

    expect((await post({ identity_token: token, user_id: 'apple_sub_valid' })).statusCode).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
      .setSubject('apple_sub_valid')
      .setIssuer(APPLE_ISSUER)
      .setAudience(BUNDLE_ID)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(privateKey);

    expect((await post({ identity_token: token, user_id: 'apple_sub_valid' })).statusCode).toBe(401);
  });

  // Audit 1.4.8. The classic algorithm-confusion attack: take the public key
  // everyone can fetch, use its bytes as an HMAC secret, and claim alg HS256.
  //
  // Measured honestly: this test passes with OR without the `algorithms`
  // allowlist in auth.ts today, because jose independently refuses to use an
  // asymmetric JWKS key for a symmetric algorithm. That is precisely what the
  // audit meant by "VERIFIED by library invariant, not by declaration". This
  // asserts the outcome, which is what must never regress; the allowlist is
  // what keeps the outcome true if that library behaviour ever changes.
  it('refuses an HS256 token forged from the public key', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: exportKey wants a CryptoKey, which is not typed to accept unknown
    const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', publicKey as any));
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', kid: TEST_KID })
      .setSubject('apple_sub_valid')
      .setIssuer(APPLE_ISSUER)
      .setAudience(BUNDLE_ID)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(spki);

    expect((await post({ identity_token: forged, user_id: 'apple_sub_valid' })).statusCode).toBe(401);
  });

  // Audit 2.2.1, and the guard on the columns dropped in migration 0054.
  // AppleSignInSchema is not .strict(), so a shipped client still sending these
  // must keep signing in while the values go nowhere.
  it('ignores email and display_name from an older client without failing the sign-in', async () => {
    const res = await post({
      identity_token: await appleToken(),
      user_id: 'apple_sub_valid',
      email: 'someone@example.com',
      display_name: 'A Real Name',
    });

    expect(res.statusCode).toBe(200);

    const { db } = await import('../src/db/client.js');
    const { users } = await import('../src/db/schema.js');
    const rows = await db().select().from(users);
    expect(JSON.stringify(rows)).not.toContain('someone@example.com');
    expect(JSON.stringify(rows)).not.toContain('A Real Name');
  });

  // Audit 1.4.1: a database dump must not yield a usable bearer token.
  it('stores the session token only as a hash', async () => {
    const res = await post({ identity_token: await appleToken(), user_id: 'apple_sub_valid' });
    const issued = res.json<{ token: string }>().token;

    const { db } = await import('../src/db/client.js');
    const { sessions } = await import('../src/db/schema.js');
    const rows = await db().select().from(sessions);

    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toContain(issued);
  });

  it('does not return the identity token or any Apple claim in the response body', async () => {
    const token = await appleToken();
    const res = await post({ identity_token: token, user_id: 'apple_sub_valid' });

    expect(res.body).not.toContain(token);
    expect(res.body).not.toContain('apple_sub_valid');
  });
});
