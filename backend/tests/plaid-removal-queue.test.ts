import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from './db-helper.js';

const ITEM_ID = 'item_removal_queue_test';
const ACCESS_TOKEN = 'access-sandbox-queued';

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

// `times` defaults to 3 because fetchWithRetry treats a 5xx as retryable
// (util/fetch.ts RETRYABLE_STATUSES: 500, 502, 503, 504). With a single-shot
// interceptor the second attempt misses the mock and throws something that is
// not a PlaidApiError, so the drain sees no error_code and the test measures
// the harness rather than a vendor that is genuinely down.
function mockItemRemove(reply: { status: number; body: unknown; times?: number }): void {
  mockAgent
    .get('https://sandbox.plaid.com')
    .intercept({ path: '/item/remove', method: 'POST' })
    .reply(reply.status, reply.body)
    .times(reply.times ?? 3);
}

function plaidError(code: string): Record<string, string | null> {
  return {
    error_type: 'ITEM_ERROR',
    error_code: code,
    error_message: 'vendor prose that must never reach a log line',
    display_message: null,
    request_id: 'req_rm',
  };
}

describe('removalBackoffMs', () => {
  it('starts at one scheduler tick', async () => {
    const { removalBackoffMs } = await import('../src/store/plaid-removal-queue.js');
    expect(removalBackoffMs(1)).toBe(15 * 60 * 1000);
  });

  it('doubles with each attempt', async () => {
    const { removalBackoffMs } = await import('../src/store/plaid-removal-queue.js');
    expect(removalBackoffMs(2)).toBe(30 * 60 * 1000);
    expect(removalBackoffMs(3)).toBe(60 * 60 * 1000);
  });

  it('caps at a day rather than growing without bound', async () => {
    const { removalBackoffMs } = await import('../src/store/plaid-removal-queue.js');
    expect(removalBackoffMs(50)).toBe(24 * 60 * 60 * 1000);
  });
});

describe('the removal queue', () => {
  it('round-trips the token through encryption', async () => {
    const { enqueueItemRemoval, listDueRemovals } = await import('../src/store/plaid-removal-queue.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN, errorCode: 'INTERNAL_SERVER_ERROR' });

    const due = await listDueRemovals(new Date(Date.now() + 60 * 60 * 1000));
    expect(due).toHaveLength(1);
    expect(due[0]?.accessToken).toBe(ACCESS_TOKEN);
  });

  it('stores the token encrypted, not in the clear', async () => {
    const { enqueueItemRemoval } = await import('../src/store/plaid-removal-queue.js');
    const { db } = await import('../src/db/client.js');
    const { plaidRemovalQueue } = await import('../src/db/schema.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });

    const [row] = await db().select().from(plaidRemovalQueue);
    expect(row?.accessToken).not.toBe(ACCESS_TOKEN);
  });

  it('keeps one row per item when the same item fails twice', async () => {
    const { countPendingRemovals, enqueueItemRemoval, listDueRemovals } = await import(
      '../src/store/plaid-removal-queue.js'
    );
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: 'access-sandbox-relinked' });

    expect(await countPendingRemovals()).toBe(1);
    const due = await listDueRemovals(new Date(Date.now() + 60 * 60 * 1000));
    // The newest token wins: a relink issues a new one for the same item_id and
    // invalidates its predecessor, so the older one can no longer remove it.
    expect(due[0]?.accessToken).toBe('access-sandbox-relinked');
    expect(due[0]?.attempts).toBe(2);
  });

  it('withholds a row whose backoff has not elapsed', async () => {
    const { enqueueItemRemoval, listDueRemovals } = await import('../src/store/plaid-removal-queue.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });

    // One attempt means a 15 minute wait; five minutes is not enough.
    expect(await listDueRemovals(new Date(Date.now() + 5 * 60 * 1000))).toHaveLength(0);
  });
});

describe('drainPlaidRemovalQueue', () => {
  it('deletes the row once Plaid accepts the removal', async () => {
    const { enqueueItemRemoval, countPendingRemovals } = await import('../src/store/plaid-removal-queue.js');
    const { drainPlaidRemovalQueue } = await import('../src/scheduler/plaid-removals.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });
    mockItemRemove({ status: 200, body: { request_id: 'req_rm' } });

    const summary = await drainPlaidRemovalQueue(new Date(Date.now() + 60 * 60 * 1000));
    expect(summary).toMatchObject({ attempted: 1, removed: 1, failed: 0 });
    expect(await countPendingRemovals()).toBe(0);
  });

  it('drops the row when Plaid says the Item is already gone', async () => {
    const { enqueueItemRemoval, countPendingRemovals } = await import('../src/store/plaid-removal-queue.js');
    const { drainPlaidRemovalQueue } = await import('../src/scheduler/plaid-removals.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });
    mockItemRemove({ status: 400, body: plaidError('ITEM_NOT_FOUND') });

    const summary = await drainPlaidRemovalQueue(new Date(Date.now() + 60 * 60 * 1000));
    expect(summary).toMatchObject({ attempted: 1, alreadyGone: 1, removed: 0 });
    expect(await countPendingRemovals()).toBe(0);
  });

  // The failure that matters. Giving up on a retryable error re-opens the leak
  // the queue exists to close, so the row has to survive and come back.
  it('keeps the row and counts the attempt when Plaid is unreachable', async () => {
    const { enqueueItemRemoval, listDueRemovals } = await import('../src/store/plaid-removal-queue.js');
    const { drainPlaidRemovalQueue } = await import('../src/scheduler/plaid-removals.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });
    mockItemRemove({
      status: 500,
      body: { ...plaidError('INTERNAL_SERVER_ERROR'), error_type: 'API_ERROR' },
    });

    const summary = await drainPlaidRemovalQueue(new Date(Date.now() + 60 * 60 * 1000));
    expect(summary).toMatchObject({ attempted: 1, failed: 1, removed: 0 });

    const due = await listDueRemovals(new Date(Date.now() + 24 * 60 * 60 * 1000));
    expect(due).toHaveLength(1);
    expect(due[0]?.attempts).toBe(2);
    expect(due[0]?.lastErrorCode).toBe('INTERNAL_SERVER_ERROR');
    // And the token is still readable, which is what the next attempt needs.
    expect(due[0]?.accessToken).toBe(ACCESS_TOKEN);
  });

  // INVALID_API_KEYS is ours, not the Item's: retrying is right, dropping is
  // how a config mistake turns into a permanent charge.
  it('retries a credentials error rather than abandoning the Item', async () => {
    const { enqueueItemRemoval, countPendingRemovals } = await import('../src/store/plaid-removal-queue.js');
    const { drainPlaidRemovalQueue } = await import('../src/scheduler/plaid-removals.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });
    mockItemRemove({ status: 400, body: { ...plaidError('INVALID_API_KEYS'), error_type: 'INVALID_INPUT' } });

    const summary = await drainPlaidRemovalQueue(new Date(Date.now() + 60 * 60 * 1000));
    expect(summary).toMatchObject({ failed: 1 });
    expect(await countPendingRemovals()).toBe(1);
  });

  it('does nothing on an empty queue', async () => {
    const { drainPlaidRemovalQueue } = await import('../src/scheduler/plaid-removals.js');
    const summary = await drainPlaidRemovalQueue(new Date());
    expect(summary).toEqual({ attempted: 0, removed: 0, alreadyGone: 0, failed: 0 });
  });

  it('skips a row whose backoff has not elapsed', async () => {
    const { enqueueItemRemoval, countPendingRemovals } = await import('../src/store/plaid-removal-queue.js');
    const { drainPlaidRemovalQueue } = await import('../src/scheduler/plaid-removals.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });

    // No /item/remove is mocked: net connect is disabled, so if the drain
    // called Plaid here this test would fail rather than pass quietly.
    const summary = await drainPlaidRemovalQueue(new Date(Date.now() + 60 * 1000));
    expect(summary.attempted).toBe(0);
    expect(await countPendingRemovals()).toBe(1);
  });

  it('never puts a Plaid error_message in what it returns', async () => {
    const { enqueueItemRemoval, listDueRemovals } = await import('../src/store/plaid-removal-queue.js');
    const { drainPlaidRemovalQueue } = await import('../src/scheduler/plaid-removals.js');
    await enqueueItemRemoval({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN });
    mockItemRemove({ status: 500, body: { ...plaidError('INTERNAL_SERVER_ERROR'), error_type: 'API_ERROR' } });

    await drainPlaidRemovalQueue(new Date(Date.now() + 60 * 60 * 1000));
    const due = await listDueRemovals(new Date(Date.now() + 24 * 60 * 60 * 1000));
    expect(JSON.stringify(due)).not.toContain('vendor prose');
  });
});
