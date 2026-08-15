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

  // processed_events is keyed by the Plaid transaction id, not by user, so the
  // cascade cannot reach it. Deleting the account used to leave a deleted
  // user's transaction identifiers in the table until 10,000 newer events
  // pushed them out.
  it('clears the processed-event ids belonging to the deleted user', async () => {
    const { buildApp } = await import('../src/server.js');
    const { db } = await import('../src/db/client.js');
    const { processedEvents, transactions } = await import('../src/db/schema.js');
    const { claimEvent } = await import('../src/store/events.js');

    await db().insert(transactions).values({
      transactionId: 'txn_deleted_user',
      userId: testUserId,
      accountId: 'acct_1',
      amount: '12.34',
      date: '2026-08-01',
    });
    expect(await claimEvent('txn_deleted_user')).toBe(true);
    // An event belonging to nobody in this test must survive: the purge is
    // scoped to the user, not a truncate.
    expect(await claimEvent('txn_someone_else')).toBe(true);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const remaining = await db().select({ id: processedEvents.id }).from(processedEvents);
    expect(remaining.map((r) => r.id)).toEqual(['txn_someone_else']);

    await app.close();
  });

  // app_store_notifications is the replay guard, keyed by Apple's
  // notificationUUID with no user column, so the row has to outlive the
  // account. Apple's stable per-subscriber id must not.
  it('forgets the Apple subscriber id on the notification ledger', async () => {
    const { buildApp } = await import('../src/server.js');
    const { db } = await import('../src/db/client.js');
    const { appStoreNotifications } = await import('../src/db/schema.js');
    const { ensureEntitlementRow, updateEntitlement } = await import('../src/store/entitlements.js');
    const { eq } = await import('drizzle-orm');
    const { entitlements } = await import('../src/db/schema.js');

    await ensureEntitlementRow(testUserId);
    await updateEntitlement(testUserId, { tier: 'individual', status: 'active' });
    await db()
      .update(entitlements)
      .set({ originalTransactionId: 'orig_tx_1' })
      .where(eq(entitlements.userId, testUserId));

    await db()
      .insert(appStoreNotifications)
      .values([
        {
          notificationUuid: 'uuid-mine',
          notificationType: 'DID_RENEW',
          originalTransactionId: 'orig_tx_1',
        },
        {
          notificationUuid: 'uuid-theirs',
          notificationType: 'DID_RENEW',
          originalTransactionId: 'orig_tx_2',
        },
      ]);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const rows = await db().select().from(appStoreNotifications);
    const mine = rows.find((r) => r.notificationUuid === 'uuid-mine');
    const theirs = rows.find((r) => r.notificationUuid === 'uuid-theirs');
    // The ledger row survives so a redelivery is still recognised as a
    // duplicate; the identifier does not.
    expect(mine?.originalTransactionId).toBeNull();
    expect(theirs?.originalTransactionId).toBe('orig_tx_2');

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
