import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  // The account-deletion half of the billing leak, and the harder half:
  // deleteUser cascades plaid_items away through the user foreign key, so
  // before the removal queue existed a Plaid outage during a deletion
  // destroyed the only credential that could ever cancel the Item. The queue
  // row carries no user_id and no foreign key precisely so it survives here.
  it('keeps the access token for retry when Plaid item/remove fails', async () => {
    const { buildApp } = await import('../src/server.js');
    const { upsertItem } = await import('../src/store/items.js');
    const { getUserById } = await import('../src/store/users.js');
    const { listDueRemovals } = await import('../src/store/plaid-removal-queue.js');

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

    const queued = await listDueRemovals(new Date(Date.now() + 60 * 60 * 1000));
    expect(queued).toHaveLength(1);
    expect(queued[0]?.itemId).toBe('item_a');
    expect(queued[0]?.accessToken).toBe('access-sandbox-a');

    await app.close();
  });

  // The queue is a billing safeguard and the deletion is a statutory
  // obligation, so the safeguard must not be able to block it. Before the queue
  // write was wrapped, a throw here escaped the catch, abandoned the loop and
  // aborted the whole request.
  it('still deletes the account when the removal queue write fails', async () => {
    const { buildApp } = await import('../src/server.js');
    const { upsertItem } = await import('../src/store/items.js');
    const { getUserById } = await import('../src/store/users.js');
    const queue = await import('../src/store/plaid-removal-queue.js');

    await upsertItem({ itemId: 'item_a', accessToken: 'access-sandbox-a', userId: testUserId });

    mockAgent.get('https://sandbox.plaid.com').intercept({ path: '/item/remove', method: 'POST' }).reply(500, {
      error_type: 'API_ERROR',
      error_code: 'INTERNAL_SERVER_ERROR',
      error_message: 'boom',
      display_message: null,
      request_id: 'req_test',
    });

    const spy = vi.spyOn(queue, 'enqueueItemRemoval').mockRejectedValue(new Error('queue write failed'));
    try {
      const app = await buildApp();
      const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
      expect(res.statusCode).toBe(204);
      expect(await getUserById(testUserId)).toBeNull();
      await app.close();
    } finally {
      spy.mockRestore();
    }
  });

  // Right-to-delete is not conditional on the queue: nothing about retaining a
  // credential for cancellation may leave user-linked data behind.
  it('queues nothing when Plaid accepts the removal', async () => {
    const { buildApp } = await import('../src/server.js');
    const { upsertItem } = await import('../src/store/items.js');
    const { countPendingRemovals } = await import('../src/store/plaid-removal-queue.js');

    await upsertItem({ itemId: 'item_a', accessToken: 'access-sandbox-a', userId: testUserId });

    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/item/remove', method: 'POST' })
      .reply(200, { request_id: 'req_test' });

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/account', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(await countPendingRemovals()).toBe(0);

    await app.close();
  });
});

// Part 1 row 1.4.5, the stolen-phone case. The user signs in on a replacement
// device and ends every other session from there.
describe('POST /api/account/sessions/revoke-all', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/account/sessions/revoke-all' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('ends the other sessions and keeps the caller signed in', async () => {
    const { buildApp } = await import('../src/server.js');
    const { createSession } = await import('../src/store/sessions.js');
    const app = await buildApp();

    // The device that was taken, plus the replacement the request comes from.
    const stolen = await createSession(testUserId);
    const replacement = await createSession(testUserId);
    const replacementHeader = { authorization: `Bearer ${replacement.rawToken}` };

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/sessions/revoke-all',
      headers: replacementHeader,
    });
    expect(res.statusCode).toBe(200);
    // The stolen device and the session db-helper minted.
    expect(res.json<{ revoked: number }>().revoked).toBe(2);

    const thief = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: `Bearer ${stolen.rawToken}` },
    });
    expect(thief.statusCode).toBe(401);

    const owner = await app.inject({ method: 'GET', url: '/api/pets', headers: replacementHeader });
    expect(owner.statusCode).toBe(200);

    await app.close();
  });

  it('leaves a second user signed in', async () => {
    const { buildApp } = await import('../src/server.js');
    const { createSession } = await import('../src/store/sessions.js');
    const { findOrCreateUser } = await import('../src/store/users.js');
    const app = await buildApp();

    const otherUserId = await findOrCreateUser({ appleSub: 'revoke_all_other' });
    const other = await createSession(otherUserId);

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/sessions/revoke-all',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);

    const survives = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: `Bearer ${other.rawToken}` },
    });
    expect(survives.statusCode).toBe(200);

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
