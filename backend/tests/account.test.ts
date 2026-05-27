import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('DELETE /api/account', () => {
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

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('deletes a user with no linked items', async () => {
    const { buildApp } = await import('../src/server.js');
    const { getUserById } = await import('../src/store/users.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    expect(await getUserById(testUserId)).toBeNull();

    // Subsequent requests with the now-orphaned session token must 401.
    const followup = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    expect(followup.statusCode).toBe(401);

    await app.close();
  });

  it('calls Plaid item/remove for each linked item and cascades child rows', async () => {
    const { buildApp } = await import('../src/server.js');
    const { upsertItem, getItemsByUser } = await import('../src/store/items.js');
    const { getUserById } = await import('../src/store/users.js');

    await upsertItem({ itemId: 'item_a', accessToken: 'access-sandbox-a', userId: testUserId });
    await upsertItem({ itemId: 'item_b', accessToken: 'access-sandbox-b', userId: testUserId });

    const removeCalls: string[] = [];
    const pool = mockAgent.get('https://sandbox.plaid.com');
    pool
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(200, (opts) => {
        const body = JSON.parse(String(opts.body)) as { access_token: string };
        removeCalls.push(body.access_token);
        return { request_id: 'req_test' };
      })
      .times(2);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    expect(removeCalls.sort()).toEqual(['access-sandbox-a', 'access-sandbox-b']);
    expect(await getUserById(testUserId)).toBeNull();
    expect(await getItemsByUser(testUserId)).toEqual([]);

    await app.close();
  });

  it('still deletes the user when Plaid item/remove fails', async () => {
    const { buildApp } = await import('../src/server.js');
    const { upsertItem } = await import('../src/store/items.js');
    const { getUserById } = await import('../src/store/users.js');

    await upsertItem({ itemId: 'item_a', accessToken: 'access-sandbox-a', userId: testUserId });

    const pool = mockAgent.get('https://sandbox.plaid.com');
    pool.intercept({ path: '/item/remove', method: 'POST' }).reply(500, {
      error_type: 'API_ERROR',
      error_code: 'INTERNAL_SERVER_ERROR',
      error_message: 'boom',
      display_message: null,
      request_id: 'req_test',
    });

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(await getUserById(testUserId)).toBeNull();

    await app.close();
  });
});

describe('PATCH /api/account', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('updates display name and returns ok', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/account',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'Coiny Test' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean }>().ok).toBe(true);

    await app.close();
  });

  it('returns 400 for missing display_name', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/account',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('invalidates the session token', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean }>().ok).toBe(true);

    // After logout the token should be revoked.
    const followup = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    expect(followup.statusCode).toBe(401);

    await app.close();
  });
});
