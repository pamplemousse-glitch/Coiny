// The connection-health sweep (testing-strategy section 8 item 3).
//
// The failure this exists for is the one webhooks cannot cover: an item that
// broke while no webhook arrived, leaving reality and the database disagreeing
// with nothing anywhere to notice. So the tests that matter most here are the
// ones where the stored status is WRONG before the sweep runs.

import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const ITEM_ID = 'item_health_sweep';
const ACCESS_TOKEN = 'access-sandbox-health';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

const silentLog = { info: () => {}, warn: () => {} };

beforeEach(async () => {
  await resetDatabase();
  const { upsertItem } = await import('../src/store/items.js');
  await upsertItem({ itemId: ITEM_ID, accessToken: ACCESS_TOKEN, userId: testUserId });
  const { resetHealthSweepSchedule } = await import('../src/scheduler/plaid-health.js');
  resetHealthSweepSchedule();

  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

/** One /item/get reply. `times` defaults high enough that fetchWithRetry's
 *  5xx retries cannot miss the interceptor. */
function mockItemGet(body: Record<string, unknown>, status = 200): void {
  mockAgent
    .get('https://sandbox.plaid.com')
    .intercept({ path: '/item/get', method: 'POST' })
    .reply(status, body)
    .times(3);
}

function itemBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    item: {
      item_id: ITEM_ID,
      institution_id: 'ins_1',
      institution_name: 'Test Bank',
      error: null,
      consent_expiration_time: null,
      ...over,
    },
    request_id: 'req_health',
  };
}

async function sweep(now = new Date()) {
  const { runConnectionHealthSweep } = await import('../src/scheduler/plaid-health.js');
  return runConnectionHealthSweep(now, silentLog);
}

async function statusOf(): Promise<string | undefined> {
  const { getItem } = await import('../src/store/items.js');
  return (await getItem(ITEM_ID))?.status;
}

describe('the connection-health sweep', () => {
  // THE case: Plaid says broken, we say healthy, and no webhook ever arrived.
  it('corrects an item that broke without a webhook', async () => {
    mockItemGet(itemBody({ error: { error_code: 'ITEM_LOGIN_REQUIRED', error_type: 'ITEM_ERROR' } }));

    const summary = await sweep();

    expect(summary).toMatchObject({ checked: 1, corrected: 1, failed: 0 });
    expect(await statusOf()).toBe('reauth_required');
  });

  it('marks an item expiring when consent runs out inside the window', async () => {
    const now = new Date('2026-08-17T12:00:00Z');
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    mockItemGet(itemBody({ consent_expiration_time: inThreeDays }));

    const summary = await sweep(now);

    expect(summary.corrected).toBe(1);
    expect(await statusOf()).toBe('expiring');
  });

  it('leaves an item alone when consent expires beyond the window', async () => {
    const now = new Date('2026-08-17T12:00:00Z');
    const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockItemGet(itemBody({ consent_expiration_time: inThirtyDays }));

    const summary = await sweep(now);

    expect(summary.corrected).toBe(0);
    expect(await statusOf()).toBe('healthy');
  });

  // A transient vendor error is not a lifecycle event. Telling someone to
  // re-link because Plaid was briefly busy teaches them to ignore the message.
  it('does not move an item for a transient error', async () => {
    mockItemGet(itemBody({ error: { error_code: 'INSTITUTION_DOWN', error_type: 'INSTITUTION_ERROR' } }));

    const summary = await sweep();

    expect(summary.corrected).toBe(0);
    expect(await statusOf()).toBe('healthy');
  });

  it('heals an item Plaid now reports as fine', async () => {
    const { setItemStatus } = await import('../src/store/items.js');
    await setItemStatus(ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });
    mockItemGet(itemBody());

    const summary = await sweep();

    expect(summary.corrected).toBe(1);
    expect(await statusOf()).toBe('healthy');
  });

  // Revocation is not something an absent error undoes.
  it('does not resurrect a revoked item', async () => {
    const { setItemStatus } = await import('../src/store/items.js');
    await setItemStatus(ITEM_ID, 'revoked', { errorCode: null });
    mockItemGet(itemBody());

    await sweep();

    expect(await statusOf()).toBe('revoked');
  });

  it('never downgrades reauth_required to expiring', async () => {
    const { setItemStatus } = await import('../src/store/items.js');
    await setItemStatus(ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });
    const now = new Date('2026-08-17T12:00:00Z');
    mockItemGet(itemBody({ consent_expiration_time: new Date(now.getTime() + 86_400_000).toISOString() }));

    await sweep(now);

    expect(await statusOf()).toBe('reauth_required');
  });

  it('counts a Plaid failure without changing state', async () => {
    mockItemGet(
      {
        error_type: 'API_ERROR',
        error_code: 'INTERNAL_SERVER_ERROR',
        error_message: 'boom',
        display_message: null,
        request_id: 'req_health',
      },
      500,
    );

    const summary = await sweep();

    expect(summary).toMatchObject({ checked: 1, corrected: 0, failed: 1 });
    expect(await statusOf()).toBe('healthy');
  });

  // Asking Plaid about an unlinked item spends a call to learn something
  // nobody reads.
  it('skips disabled items entirely', async () => {
    const { disableItem } = await import('../src/store/items.js');
    await disableItem(ITEM_ID);

    // No interceptor is registered, and net connect is disabled, so any call
    // to Plaid here fails the test rather than passing quietly.
    const summary = await sweep();

    expect(summary.checked).toBe(0);
  });

  it('is due once and then not again until a day has passed', async () => {
    const { isHealthSweepDue } = await import('../src/scheduler/plaid-health.js');
    const now = new Date('2026-08-17T12:00:00Z');
    expect(isHealthSweepDue(now)).toBe(true);

    mockItemGet(itemBody());
    await sweep(now);

    expect(isHealthSweepDue(new Date(now.getTime() + 60 * 60 * 1000))).toBe(false);
    expect(isHealthSweepDue(new Date(now.getTime() + 25 * 60 * 60 * 1000))).toBe(true);
  });
});
