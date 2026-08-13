import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

const TEST_ITEM_ID = 'item_link_test_1';
const TEST_ACCESS_TOKEN = 'access-sandbox-link-test';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeEach(async () => {
  await resetDatabase();
  const { upsertItem } = await import('../src/store/items.js');
  await upsertItem({ itemId: TEST_ITEM_ID, accessToken: TEST_ACCESS_TOKEN, userId: testUserId });

  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

function mockLinkTokenCreate(capture: (body: Record<string, unknown>) => void): void {
  mockAgent
    .get('https://sandbox.plaid.com')
    .intercept({ path: '/link/token/create', method: 'POST' })
    .reply(200, (opts) => {
      capture(JSON.parse(opts.body as string) as Record<string, unknown>);
      return { link_token: 'link-sandbox-update-token', expiration: '2026-08-13T12:00:00Z', request_id: 'req_lt' };
    });
}

describe('GET /api/plaid/items', () => {
  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/items' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('reports a healthy item as not repairable', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/items', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ items: Record<string, unknown>[] }>();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      item_id: TEST_ITEM_ID,
      status: 'healthy',
      last_error_code: null,
      new_accounts_available: false,
      disabled: false,
      repairable: false,
    });
    await app.close();
  });

  it('reports a broken item as repairable with its error code and change time', async () => {
    const { setItemStatus } = await import('../src/store/items.js');
    await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/items', headers: authHeader() });

    const body = res.json<{ items: Record<string, unknown>[] }>();
    expect(body.items[0]).toMatchObject({
      status: 'reauth_required',
      last_error_code: 'ITEM_LOGIN_REQUIRED',
      repairable: true,
    });
    expect(typeof body.items[0]?.status_changed_at).toBe('string');
    await app.close();
  });

  it('does not return another user item', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { upsertItem } = await import('../src/store/items.js');
    const otherUserId = await findOrCreateUser({ appleSub: 'other_apple_sub', email: 'other@coiny.test' });
    await upsertItem({ itemId: 'item_other_user', accessToken: 'access-other', userId: otherUserId });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/items', headers: authHeader() });

    const body = res.json<{ items: { item_id: string }[] }>();
    expect(body.items.map((i) => i.item_id)).toEqual([TEST_ITEM_ID]);
    await app.close();
  });
});

describe('POST /api/plaid/update-link-token', () => {
  it('mints an update-mode token with the stored access token and no products', async () => {
    let captured: Record<string, unknown> | undefined;
    mockLinkTokenCreate((body) => {
      captured = body;
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/update-link-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: TEST_ITEM_ID }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<Record<string, unknown>>();
    expect(body.link_token).toBe('link-sandbox-update-token');
    expect(body.item_id).toBe(TEST_ITEM_ID);

    // Update mode is defined by these two request properties: the existing
    // access token in, products out. Anything else creates a NEW item.
    expect(captured?.access_token).toBe(TEST_ACCESS_TOKEN);
    expect(captured).not.toHaveProperty('products');
    expect(captured).not.toHaveProperty('update');
    await app.close();
  });

  it('enables account selection when new accounts are available', async () => {
    const { setNewAccountsAvailable } = await import('../src/store/items.js');
    await setNewAccountsAvailable(TEST_ITEM_ID, true);

    let captured: Record<string, unknown> | undefined;
    mockLinkTokenCreate((body) => {
      captured = body;
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/update-link-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: TEST_ITEM_ID }),
    });

    expect(res.statusCode).toBe(200);
    expect(captured?.update).toEqual({ account_selection_enabled: true });
    await app.close();
  });

  it('returns 404 for an item belonging to another user', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { upsertItem } = await import('../src/store/items.js');
    const otherUserId = await findOrCreateUser({ appleSub: 'other_apple_sub_2', email: 'other2@coiny.test' });
    await upsertItem({ itemId: 'item_of_other', accessToken: 'access-other-2', userId: otherUserId });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/update-link-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: 'item_of_other' }),
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('returns 400 when item_id is missing', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/update-link-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 502 with the Plaid error code when Plaid rejects the request', async () => {
    mockAgent.get('https://sandbox.plaid.com').intercept({ path: '/link/token/create', method: 'POST' }).reply(400, {
      error_type: 'ITEM_ERROR',
      error_code: 'USER_PERMISSION_REVOKED',
      error_message: 'permissions were revoked',
      display_message: null,
      request_id: 'req_rej',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/update-link-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: TEST_ITEM_ID }),
    });
    expect(res.statusCode).toBe(502);
    expect(res.json<Record<string, unknown>>().plaid_error_code).toBe('USER_PERMISSION_REVOKED');
    await app.close();
  });
});

describe('POST /api/plaid/item-repaired', () => {
  it('returns a broken item to healthy and clears repair state', async () => {
    const { setItemStatus, setNewAccountsAvailable, disableItem } = await import('../src/store/items.js');
    await setItemStatus(TEST_ITEM_ID, 'revoked', { errorCode: 'USER_PERMISSION_REVOKED' });
    await setNewAccountsAvailable(TEST_ITEM_ID, true);
    await disableItem(TEST_ITEM_ID);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/item-repaired',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: TEST_ITEM_ID }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<Record<string, unknown>>()).toMatchObject({ ok: true, status: 'healthy' });

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('healthy');
    expect(item?.lastErrorCode).toBeNull();
    expect(item?.newAccountsAvailable).toBe(false);
    expect(item?.disabled).toBe(false);
    await app.close();
  });

  it('returns 404 for an item the caller does not own', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { upsertItem, setItemStatus } = await import('../src/store/items.js');
    const otherUserId = await findOrCreateUser({ appleSub: 'other_apple_sub_3', email: 'other3@coiny.test' });
    await upsertItem({ itemId: 'item_of_other_3', accessToken: 'access-other-3', userId: otherUserId });
    await setItemStatus('item_of_other_3', 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/item-repaired',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: 'item_of_other_3' }),
    });
    expect(res.statusCode).toBe(404);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem('item_of_other_3');
    expect(item?.status).toBe('reauth_required');
    await app.close();
  });
});

describe('item health store transitions', () => {
  it('relinking via upsertItem resets health state', async () => {
    const { setItemStatus, setNewAccountsAvailable, disableItem, upsertItem, getItem } = await import(
      '../src/store/items.js'
    );
    await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });
    await setNewAccountsAvailable(TEST_ITEM_ID, true);
    await disableItem(TEST_ITEM_ID);

    await upsertItem({ itemId: TEST_ITEM_ID, accessToken: 'access-sandbox-relinked', userId: testUserId });

    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('healthy');
    expect(item?.lastErrorCode).toBeNull();
    expect(item?.newAccountsAvailable).toBe(false);
    expect(item?.disabled).toBe(false);
    expect(item?.accessToken).toBe('access-sandbox-relinked');
  });

  it('setItemStatus reports the previous status and whether it changed', async () => {
    const { setItemStatus } = await import('../src/store/items.js');

    const first = await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });
    expect(first).toEqual({ previous: 'healthy', changed: true });

    const second = await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });
    expect(second).toEqual({ previous: 'reauth_required', changed: false });

    const missing = await setItemStatus('item_never_existed', 'healthy');
    expect(missing).toBeNull();
  });

  it('unlinking marks items revoked as well as disabled', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(200, { request_id: 'req_rm' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/plaid/item', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.disabled).toBe(true);
    expect(item?.status).toBe('revoked');
    await app.close();
  });
});
