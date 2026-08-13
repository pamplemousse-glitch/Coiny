import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

const SANDBOX_AUTH = 'https://auth.truelayer-sandbox.com';

// The stored access token is deliberately far in the future in most cases so
// revocation uses it directly. The refresh path gets its own test.
function futureExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

async function seedTrueLayer(expiresAt: Date = futureExpiry()): Promise<void> {
  const { db } = await import('../src/db/client.js');
  const { truelayerConnections } = await import('../src/db/schema.js');
  const { encryptString } = await import('../src/util/crypto.js');
  await db().insert(truelayerConnections).values({
    userId: testUserId,
    accessToken: encryptString('tl-access'),
    refreshToken: encryptString('tl-refresh'),
    expiresAt,
  });
}

describe('upstream grant revocation', () => {
  let originalDispatcher: Dispatcher;
  let mockAgent: MockAgent;

  beforeEach(async () => {
    await resetDatabase();
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher);
  });

  it('deletes the TrueLayer credential upstream when the account is deleted', async () => {
    await seedTrueLayer();

    let called = false;
    mockAgent
      .get(SANDBOX_AUTH)
      .intercept({ path: '/api/delete', method: 'DELETE' })
      .reply(200, () => {
        called = true;
        return '';
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(called).toBe(true);

    await app.close();
  });

  // The whole point of R-15.6: disconnecting used to drop our row and leave
  // Coiny sitting in the user's TrueLayer connected-apps list.
  it('deletes the credential upstream when the user disconnects TrueLayer', async () => {
    await seedTrueLayer();

    let called = false;
    mockAgent
      .get(SANDBOX_AUTH)
      .intercept({ path: '/api/delete', method: 'DELETE' })
      .reply(200, () => {
        called = true;
        return '';
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/truelayer/connect',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(204);
    expect(called).toBe(true);

    await app.close();
  });

  // A stored access token is usually expired by the time somebody deletes their
  // account. Revoking with a dead token would report success and leave the grant
  // standing, which is the failure this whole path exists to prevent.
  it('refreshes an expired access token before revoking', async () => {
    await seedTrueLayer(new Date(Date.now() - 1000));

    const pool = mockAgent.get(SANDBOX_AUTH);
    let refreshed = false;
    let revokedWith: string | null = null;

    pool.intercept({ path: '/connect/token', method: 'POST' }).reply(200, () => {
      refreshed = true;
      return { access_token: 'fresh-token', refresh_token: 'tl-refresh', expires_in: 3600, token_type: 'Bearer' };
    });
    pool.intercept({ path: '/api/delete', method: 'DELETE' }).reply(200, (opts) => {
      revokedWith = String((opts.headers as Record<string, string>).Authorization ?? '');
      return '';
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(refreshed).toBe(true);
    expect(revokedWith).toBe('Bearer fresh-token');

    await app.close();
  });

  // GLBA and CCPA both give a deletion right that does not depend on a third
  // party being reachable. A TrueLayer outage must not strand the user.
  it('still deletes the account when TrueLayer revocation fails', async () => {
    await seedTrueLayer();

    mockAgent.get(SANDBOX_AUTH).intercept({ path: '/api/delete', method: 'DELETE' }).reply(500, '');

    const { buildApp } = await import('../src/server.js');
    const { getUserById } = await import('../src/store/users.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(await getUserById(testUserId)).toBeNull();

    await app.close();
  });

  it('reports which providers cannot be revoked programmatically', async () => {
    const { db } = await import('../src/db/client.js');
    const { discogsConnections, ynabConnections } = await import('../src/db/schema.js');
    const { encryptString } = await import('../src/util/crypto.js');

    await db().insert(ynabConnections).values({ userId: testUserId, apiKey: encryptString('pat') });
    await db().insert(discogsConnections).values({
      userId: testUserId,
      username: 'someone',
      accessToken: encryptString('a'),
      accessTokenSecret: encryptString('b'),
    });

    const { revokeUpstreamGrants } = await import('../src/revoke/upstream.js');
    const log = { warn: () => {}, info: () => {} } as unknown as import('fastify').FastifyBaseLogger;
    const outcomes = await revokeUpstreamGrants(testUserId, log);

    expect(outcomes).toContainEqual({ provider: 'ynab', result: 'unsupported_by_provider' });
    expect(outcomes).toContainEqual({ provider: 'discogs', result: 'unsupported_by_provider' });
    expect(outcomes).toContainEqual({ provider: 'truelayer', result: 'no_connection' });
  });

  it('skips revocation rather than throwing when TrueLayer is not configured', async () => {
    const { config } = await import('../src/config.js');
    const savedId = config.TRUELAYER_CLIENT_ID;
    const savedSecret = config.TRUELAYER_CLIENT_SECRET;
    config.TRUELAYER_CLIENT_ID = '';
    config.TRUELAYER_CLIENT_SECRET = '';

    await seedTrueLayer();

    const { revokeUpstreamGrants } = await import('../src/revoke/upstream.js');
    const log = { warn: () => {}, info: () => {} } as unknown as import('fastify').FastifyBaseLogger;
    const outcomes = await revokeUpstreamGrants(testUserId, log);

    expect(outcomes).toContainEqual({ provider: 'truelayer', result: 'not_configured' });

    config.TRUELAYER_CLIENT_ID = savedId;
    config.TRUELAYER_CLIENT_SECRET = savedSecret;
  });
});
