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

describe('institution identity (S-17)', () => {
  const PLAID_ERROR_400 = {
    error_type: 'ITEM_ERROR',
    error_code: 'ITEM_NOT_FOUND',
    error_message: 'item not found',
    display_message: null,
    request_id: 'req_err',
  };

  function mockItemGet(institutionName: string | null): void {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/get', method: 'POST' })
      .reply(200, {
        item: {
          item_id: 'item_inst_1',
          institution_id: institutionName === null ? null : 'ins_109508',
          institution_name: institutionName,
        },
        request_id: 'req_ig',
      });
  }

  it('captures the institution at link time and returns it from GET /api/plaid/items', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/public_token/exchange', method: 'POST' })
      .reply(200, { access_token: 'access-sandbox-new', item_id: 'item_inst_1', request_id: 'req_ex' });
    mockItemGet('First Platypus Bank');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/exchange-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ public_token: 'public-sandbox-abc' }),
    });
    expect(res.statusCode).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    const stored = await getItem('item_inst_1');
    expect(stored?.institutionName).toBe('First Platypus Bank');
    expect(stored?.institutionId).toBe('ins_109508');

    // The read is pure DB: no /item/get interceptor is registered for the
    // linked item here, so a fetch attempt would come back nameless.
    const itemsRes = await app.inject({ method: 'GET', url: '/api/plaid/items', headers: authHeader() });
    const body = itemsRes.json<{ items: { item_id: string; institution_name: string | null }[] }>();
    const linked = body.items.find((i) => i.item_id === 'item_inst_1');
    expect(linked?.institution_name).toBe('First Platypus Bank');
    await app.close();
  });

  it('a failed institution lookup does not fail the link', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/public_token/exchange', method: 'POST' })
      .reply(200, { access_token: 'access-sandbox-new-2', item_id: 'item_inst_2', request_id: 'req_ex2' });
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/get', method: 'POST' })
      .reply(400, PLAID_ERROR_400);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/exchange-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ public_token: 'public-sandbox-def' }),
    });
    expect(res.statusCode).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    expect((await getItem('item_inst_2'))?.institutionName).toBeNull();
    await app.close();
  });

  it('lazily backfills the institution for items linked before the columns existed', async () => {
    // TEST_ITEM_ID was upserted with no institution, like every pre-0047 item.
    mockItemGet('Tartan Bank');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/items', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ items: { institution_name: string | null }[] }>();
    expect(body.items[0]?.institution_name).toBe('Tartan Bank');

    // Persisted, not just decorated: the store row now carries the name, so
    // the next read needs no Plaid call.
    const { getItem } = await import('../src/store/items.js');
    expect((await getItem(TEST_ITEM_ID))?.institutionName).toBe('Tartan Bank');
    await app.close();
  });

  it('still returns item health when the backfill fetch fails', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/get', method: 'POST' })
      .reply(400, PLAID_ERROR_400);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/items', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ items: { item_id: string; institution_name: string | null }[] }>();
    expect(body.items[0]).toMatchObject({ item_id: TEST_ITEM_ID, institution_name: null });
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

    // Repair completion is server-observed at THIS endpoint (R-24.2), so the
    // event is emitted here, never client-reported.
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const events = await listAnalyticsEvents(testUserId, 'item_state_changed');
    expect(events.map((e) => e.properties)).toContainEqual({ state: 'repaired' });
    await app.close();
  });

  it('does not emit a repaired event when the item was already healthy', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/item-repaired',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: TEST_ITEM_ID }),
    });
    expect(res.statusCode).toBe(200);

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const events = await listAnalyticsEvents(testUserId, 'item_state_changed');
    expect(events.map((e) => e.properties)).not.toContainEqual({ state: 'repaired' });
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

  // userId rides along so the webhook can emit item_state_changed without a
  // second lookup: Plaid webhooks arrive keyed by item_id with no user context.
  it('setItemStatus reports the previous status, whether it changed, and the owner', async () => {
    const { setItemStatus } = await import('../src/store/items.js');

    const first = await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });
    expect(first).toEqual({ previous: 'healthy', changed: true, userId: testUserId });

    const second = await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });
    expect(second).toEqual({ previous: 'reauth_required', changed: false, userId: testUserId });

    const missing = await setItemStatus('item_never_existed', 'healthy');
    expect(missing).toBeNull();
  });

  // The disposal schedule says nothing retains a revoked credential, and every
  // other provider drops its row at disconnect. The encrypted access token, the
  // cursor and the institution all live on this row, so the row has to go.
  it('unlinking deletes the item row, credential and all', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(200, { request_id: 'req_rm' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/plaid/item', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const { getItem } = await import('../src/store/items.js');
    expect(await getItem(TEST_ITEM_ID)).toBeNull();
    await app.close();
  });

  // Open decision B7, settled: disconnect deletes immediately. Before this,
  // unlinking dropped the `plaid_items` row and nothing else, so every
  // transaction, recurring stream, liability and balance survived forever with
  // no record the item had gone. None of them reference `item_id`, so nothing
  // cascaded and nothing could have been purged on a timer either.
  it('unlinking purges every Plaid-derived row, not just the item', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');
    const { upsertRecurringStreams } = await import('../src/store/plaid-recurring.js');

    await persistTransactions(testUserId, [
      {
        id: 'purge_t1',
        account_id: 'a1',
        amount: '-10.99',
        date: '2026-08-01',
        description: 'Spotify',
        status: 'posted',
        type: 'card_payment',
        running_balance: null,
        details: { counterparty: { name: 'Spotify' }, category: 'entertainment' },
      },
    ]);
    await upsertRecurringStreams(testUserId, [], [
      {
        stream_id: 'purge_s1',
        account_id: 'a1',
        description: 'SPOTIFY USA',
        merchant_name: 'Spotify',
        frequency: 'MONTHLY',
        average_amount: { amount: 10.99 },
        last_amount: { amount: 10.99 },
        last_date: '2026-08-01',
        status: 'MATURE',
      },
    ] as never);

    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(200, { request_id: 'req_rm' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/plaid/item', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const { getRecentOutflows } = await import('../src/store/transactions.js');
    const { getRecurringStreams } = await import('../src/store/plaid-recurring.js');
    expect(await getRecentOutflows(testUserId, 365)).toHaveLength(0);
    const streams = await getRecurringStreams(testUserId);
    expect([...streams.inflow, ...streams.outflow]).toHaveLength(0);

    await app.close();
  });

  // Deleting the row must not cost the observability the disable path provides:
  // item_state_changed is emitted while the row still exists (R-24.2).
  it('unlinking still emits item_state_changed before the row goes', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(200, { request_id: 'req_rm' });

    const { buildApp } = await import('../src/server.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/plaid/item', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const events = await listAnalyticsEvents(testUserId, 'item_state_changed');
    expect(events.map((e) => e.properties)).toContainEqual({ state: 'revoked' });
    await app.close();
  });

  // Right-to-disconnect cannot depend on Plaid being reachable: the item row
  // has to go even when item/remove fails.
  it('unlinking deletes the row even when item/remove fails', async () => {
    mockAgent.get('https://sandbox.plaid.com').intercept({ path: '/item/remove', method: 'POST' }).reply(500, {
      error_type: 'API_ERROR',
      error_code: 'INTERNAL_SERVER_ERROR',
      error_message: 'boom',
      display_message: null,
      request_id: 'req_rm',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/plaid/item', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const { getItem } = await import('../src/store/items.js');
    expect(await getItem(TEST_ITEM_ID)).toBeNull();
    await app.close();
  });

  // The other half of the test above, and the reason the queue exists. Deleting
  // the row destroys the only copy of the access token, and without it a failed
  // /item/remove leaves an Item that Plaid bills monthly, that cannot be
  // cancelled, and that has permanently consumed one of ten Trial connections.
  it('unlinking queues the access token when item/remove fails', async () => {
    // .times(3) because fetchWithRetry treats a 5xx as retryable (util/fetch.ts
    // RETRYABLE_STATUSES). A single-shot mock would make attempts 2 and 3 miss
    // the interceptor and throw something that is not a PlaidApiError, which is
    // the test harness behaving unlike a vendor that is genuinely down.
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(500, {
        error_type: 'API_ERROR',
        error_code: 'INTERNAL_SERVER_ERROR',
        error_message: 'boom',
        display_message: null,
        request_id: 'req_rm',
      })
      .times(3);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/plaid/item', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const { listDueRemovals } = await import('../src/store/plaid-removal-queue.js');
    // Past the first backoff: enqueue stamps last_attempt_at, so a read at
    // "now" correctly sees nothing due yet.
    const queued = await listDueRemovals(new Date(Date.now() + 60 * 60 * 1000));
    expect(queued).toHaveLength(1);
    expect(queued[0]?.itemId).toBe(TEST_ITEM_ID);
    // The token survives the row that held it, which is the entire point.
    expect(queued[0]?.accessToken).toBe(TEST_ACCESS_TOKEN);
    await app.close();
  });

  // The queue must stay empty on the happy path, or the drain retries removals
  // Plaid has already accepted and the log fills with noise nobody can act on.
  it('unlinking queues nothing when item/remove succeeds', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(200, { request_id: 'req_rm' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/plaid/item', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const { countPendingRemovals } = await import('../src/store/plaid-removal-queue.js');
    expect(await countPendingRemovals()).toBe(0);
    await app.close();
  });
});

describe('GET /api/plaid/institutions', () => {
  it('returns branding for the linked institution', async () => {
    const { setItemInstitution } = await import('../src/store/items.js');
    await setItemInstitution(TEST_ITEM_ID, { institutionId: 'ins_109512', institutionName: 'Chase' });

    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/institutions/get_by_id', method: 'POST' })
      .reply(200, {
        institution: {
          institution_id: 'ins_109512',
          name: 'Chase',
          primary_color: '#004966',
          logo: 'iVBORw0KGgo=',
          url: 'https://chase.com',
        },
        request_id: 'r1',
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/institutions', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ institutions: Array<Record<string, unknown>> }>();
    expect(body.institutions[0]).toMatchObject({
      institutionId: 'ins_109512',
      name: 'Chase',
      primaryColor: '#004966',
      logo: 'iVBORw0KGgo=',
    });
    await app.close();
  });

  it('omits an institution whose lookup fails rather than breaking the screen', async () => {
    const { setItemInstitution } = await import('../src/store/items.js');
    await setItemInstitution(TEST_ITEM_ID, { institutionId: 'ins_broken', institutionName: 'Somebank' });

    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/institutions/get_by_id', method: 'POST' })
      .reply(500, { error_type: 'API_ERROR', error_code: 'INTERNAL_SERVER_ERROR', error_message: 'boom' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/plaid/institutions', headers: authHeader() });

    // Branding is a garnish: the list of banks must still render.
    expect(res.statusCode).toBe(200);
    expect(res.json<{ institutions: unknown[] }>().institutions).toEqual([]);
    await app.close();
  });
});

describe('POST /api/plaid/investments/sync', () => {
  it('stores investment transactions with the sign flipped', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/investments/transactions/get', method: 'POST' })
      .reply(200, {
        investment_transactions: [
          {
            investment_transaction_id: 'itx-route-1',
            account_id: 'acct-brokerage',
            security_id: 'sec-1',
            date: '2026-08-01',
            name: 'CONTRIBUTION',
            quantity: 0,
            amount: -750,
            price: 0,
            fees: 0,
            type: 'cash',
            subtype: 'contribution',
            iso_currency_code: 'USD',
          },
        ],
        total_investment_transactions: 1,
        request_id: 'r1',
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/investments/sync',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      payload: '{}',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ stored: number }>().stored).toBe(1);

    const { getInvestmentContributions } = await import('../src/store/investment-transactions.js');
    const rows = await getInvestmentContributions(testUserId, 'acct-brokerage', '2026-01-01');
    expect(rows[0]?.amount).toBe(750);
    await app.close();
  });

  it('survives an item that does not have the investments product', async () => {
    // The normal case for a plain checking account. One item without
    // investments must not fail the sync for the items that have it.
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/investments/transactions/get', method: 'POST' })
      .reply(400, {
        error_type: 'INVALID_INPUT',
        error_code: 'PRODUCTS_NOT_SUPPORTED',
        error_message: 'investments is not supported',
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/investments/sync',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      payload: '{}',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ stored: number }>().stored).toBe(0);
    await app.close();
  });
});
