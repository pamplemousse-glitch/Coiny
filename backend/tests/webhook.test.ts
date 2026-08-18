import { createHash, webcrypto } from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { exportJWK, type JWK, SignJWT } from 'jose';
import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// APNs is stubbed so a push counts as DELIVERED and therefore reaches
// recordNotification. Without this the connection-notification tests below
// would assert on an empty notification_log and pass for the wrong reason: no
// APNs credentials are configured in tests, so every send fails and nothing is
// ever recorded. Everything else in the dispatch path stays real, which is the
// point: quiet hours, the two-a-week budget and the same-type cooldown are all
// still exercised.
vi.mock('../src/push/apns.js', () => ({
  sendApnsPush: vi.fn(async () => undefined),
}));

import { resetDatabase, testUserId } from './db-helper.js';

// Waits for the actual background work rather than guessing at a number of
// event-loop turns. The old version yielded five times, which held locally and
// failed on slower CI runners because every DB round trip is another async
// boundary.
async function flushAll() {
  const { awaitWebhookWork } = await import('../src/webhook/plaid.js');
  await awaitWebhookWork();
}

const TEST_KID = 'test-kid-1';
const TEST_ITEM_ID = 'item_test_1';
const TEST_ACCESS_TOKEN = 'access-sandbox-test';

type Key = Parameters<typeof SignJWT.prototype.sign>[0];
let privateKey: Key;
let publicJwk: JWK & Record<string, unknown>;
let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(async () => {
  const keypair = (await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as { privateKey: unknown; publicKey: unknown };
  privateKey = keypair.privateKey as Key;
  // biome-ignore lint/suspicious/noExplicitAny: exportJWK requires CryptoKey which isn't typed to accept unknown
  publicJwk = (await exportJWK(keypair.publicKey as any)) as JWK & Record<string, unknown>;
  publicJwk.kid = TEST_KID;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';
});

beforeEach(async () => {
  await resetDatabase();
  const { _clearKeyCache, setKeyFetcher } = await import('../src/plaid/signature.js');
  _clearKeyCache();
  setKeyFetcher(async (kid) => {
    if (kid !== TEST_KID) throw new Error(`unknown kid in test: ${kid}`);
    return { ...publicJwk, kty: 'EC', crv: 'P-256', created_at: 0, expired_at: null } as never;
  });

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

async function signWebhook(body: string): Promise<string> {
  const requestBodySha256 = createHash('sha256').update(body, 'utf8').digest('hex');
  return new SignJWT({ request_body_sha256: requestBodySha256 })
    .setProtectedHeader({ alg: 'ES256', kid: TEST_KID, typ: 'JWT' })
    .setIssuedAt()
    .sign(privateKey);
}

function mockSync(response: object) {
  mockAgent
    .get('https://sandbox.plaid.com')
    .intercept({ path: '/transactions/sync', method: 'POST' })
    .reply(200, response);
}

function buildSyncEnvelope(): string {
  return JSON.stringify({
    webhook_type: 'TRANSACTIONS',
    webhook_code: 'SYNC_UPDATES_AVAILABLE',
    item_id: TEST_ITEM_ID,
    environment: 'sandbox',
  });
}

function buildAddedTx(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: 'txn_test_paycheck_1',
    account_id: 'acc_test_1',
    amount: -2400,
    iso_currency_code: 'USD',
    unofficial_currency_code: null,
    date: '2026-05-19',
    authorized_date: null,
    name: 'DIRECT DEPOSIT',
    merchant_name: 'Employer Inc',
    pending: false,
    payment_channel: 'other',
    personal_finance_category: { primary: 'INCOME', detailed: 'INCOME_WAGES' },
    counterparties: [{ name: 'Employer Inc', type: 'merchant' }],
    ...overrides,
  };
}

describe('POST /webhooks/plaid', () => {
  it('returns 401 on missing Plaid-Verification header', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json' },
      body: buildSyncEnvelope(),
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 when JWT request_body_sha256 does not match body', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const signed = await signWebhook('{"different":"body"}');
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body: buildSyncEnvelope(),
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 200 and does not react on initial sync', async () => {
    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    mockSync({
      accounts: [
        {
          account_id: 'acc_test_1',
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
      ],
      added: [buildAddedTx()],
      modified: [],
      removed: [],
      next_cursor: 'cursor-1',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_1',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });

    expect(res.statusCode).toBe(200);
    await flushAll();
    expect(spy).not.toHaveBeenCalled();

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.initialSyncComplete).toBe(true);
    expect(item?.cursor).toBe('cursor-1');

    await app.close();
  });

  it('persists webhook-carried account balances to the cache (R-16.4)', async () => {
    mockSync({
      accounts: [
        {
          account_id: 'acc_bal_1',
          balances: { current: 4321.5, available: 4000, iso_currency_code: 'USD', limit: null },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
        {
          account_id: 'acc_bal_2',
          balances: { current: null, available: 250, iso_currency_code: 'USD', limit: null },
          name: 'Savings',
          official_name: null,
          type: 'depository',
          subtype: 'savings',
        },
      ],
      added: [],
      modified: [],
      removed: [],
      next_cursor: 'cursor-bal-1',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_bal',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();

    const { getPlaidAccountBalances } = await import('../src/store/asset-cache.js');
    const rows = await getPlaidAccountBalances(testUserId);
    expect(rows.map((r) => r.accountId).sort()).toEqual(['acc_bal_1', 'acc_bal_2']);
    const checking = rows.find((r) => r.accountId === 'acc_bal_1');
    expect(parseFloat(checking!.balance!)).toBeCloseTo(4321.5);
    expect(checking?.itemId).toBe(TEST_ITEM_ID);
    expect(checking?.asOf).toBeInstanceOf(Date);
    // current is null: falls back to available.
    const savings = rows.find((r) => r.accountId === 'acc_bal_2');
    expect(parseFloat(savings!.balance!)).toBe(250);

    await app.close();
  });

  it('dispatches reactions on second sync (post-initial)', async () => {
    const { markInitialSyncComplete } = await import('../src/store/items.js');
    await markInitialSyncComplete(TEST_ITEM_ID);

    mockSync({
      accounts: [
        {
          account_id: 'acc_test_1',
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
      ],
      added: [buildAddedTx()],
      modified: [],
      removed: [],
      next_cursor: 'cursor-2',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_2',
    });

    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });

    await flushAll();
    expect(spy).toHaveBeenCalledOnce();
    // R-7.24: a paycheck is routine (happy), not a celebration. Celebrate is
    // reserved for rungs, cleared debts and achieved goals.
    expect(spy.mock.calls[0]?.[1]?.animation).toBe('happy');
    expect(spy.mock.calls[0]?.[2]).toBe('paycheck_received');

    await app.close();
  });

  it('idempotent: does not double-dispatch when the same transaction id is delivered twice', async () => {
    const { markInitialSyncComplete } = await import('../src/store/items.js');
    await markInitialSyncComplete(TEST_ITEM_ID);

    const syncResponse = {
      accounts: [
        {
          account_id: 'acc_test_1',
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
      ],
      added: [buildAddedTx({ transaction_id: 'txn_idem' })],
      modified: [],
      removed: [],
      next_cursor: 'cursor-idem',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_idem',
    };
    mockSync(syncResponse);
    mockSync(syncResponse);

    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    await flushAll();

    await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    await flushAll();

    expect(spy).toHaveBeenCalledOnce();
    await app.close();
  });

  it('logs and no-ops unhandled webhook types (AUTH)', async () => {
    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'AUTH',
      webhook_code: 'DEFAULT_UPDATE',
      item_id: TEST_ITEM_ID,
    });
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });

    expect(res.statusCode).toBe(200);
    await flushAll();
    expect(spy).not.toHaveBeenCalled();
    await app.close();
  });

  it('disables the item and marks it revoked on USER_PERMISSION_REVOKED', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'ITEM',
      webhook_code: 'USER_PERMISSION_REVOKED',
      item_id: TEST_ITEM_ID,
    });
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.disabled).toBe(true);
    expect(item?.status).toBe('revoked');
    expect(item?.statusChangedAt).not.toBeNull();

    await app.close();
  });

  it('returns 400 on malformed JSON body', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const malformedBody = Buffer.from('{not valid json');
    const signed = await signWebhook(malformedBody.toString());

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body: malformedBody,
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('no-ops gracefully for unknown item_id (link-flow race)', async () => {
    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'SYNC_UPDATES_AVAILABLE',
      item_id: 'item_does_not_exist',
      environment: 'sandbox',
    });
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();
    expect(spy).not.toHaveBeenCalled();
    await app.close();
  });

  async function postItemWebhook(
    app: FastifyInstance,
    webhookCode: string,
    extra: Record<string, unknown> = {},
  ): Promise<number> {
    const body = JSON.stringify({
      webhook_type: 'ITEM',
      webhook_code: webhookCode,
      item_id: TEST_ITEM_ID,
      ...extra,
    });
    const signed = await signWebhook(body);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    await flushAll();
    return res.statusCode;
  }

  it('marks the item reauth_required on ITEM/ERROR with ITEM_LOGIN_REQUIRED', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const status = await postItemWebhook(app, 'ERROR', {
      error: {
        error_type: 'ITEM_ERROR',
        error_code: 'ITEM_LOGIN_REQUIRED',
        error_message: 'the login details of this item have changed',
      },
    });
    expect(status).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('reauth_required');
    expect(item?.lastErrorCode).toBe('ITEM_LOGIN_REQUIRED');
    // Broken, not dead: the item stays enabled so a repair can restore sync.
    expect(item?.disabled).toBe(false);

    await app.close();
  });

  it('marks the item expiring on PENDING_EXPIRATION', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const status = await postItemWebhook(app, 'PENDING_EXPIRATION');
    expect(status).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('expiring');
    expect(item?.disabled).toBe(false);

    await app.close();
  });

  it('marks the item expiring on PENDING_DISCONNECT', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const status = await postItemWebhook(app, 'PENDING_DISCONNECT');
    expect(status).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('expiring');

    await app.close();
  });

  // testing-strategy.md section 8, items 1 and 2. Plaid sends the expiry
  // warning seven days early; Coiny used to record it and let it lapse, so a
  // user's net worth went quietly stale with the server knowing the whole time.

  /// A device that can actually receive a push: iOS token plus a timezone.
  /// Without the timezone the dispatcher suppresses rather than guessing a zone
  /// (R-9.3), so a test that forgot it would pass while pushing nothing.
  async function registerPushableDevice(): Promise<void> {
    const { upsertDeviceToken } = await import('../src/store/devices.js');
    // A zone where it is reliably NOT 21:00-08:00 local during a CI run is not
    // knowable, so quiet hours are neutralised by freezing the clock instead,
    // in each test that needs it.
    await upsertDeviceToken({ token: 'tok_push_1', platform: 'ios', userId: testUserId, timezone: 'UTC' });
  }

  /// Midday UTC: outside the 21:00-08:00 quiet window for the UTC device above.
  ///
  /// `toFake: ['Date']` is load-bearing. A bare `useFakeTimers()` also freezes
  /// setImmediate, and `awaitWebhookWork()` waits on setImmediate, so the whole
  /// suite deadlocks rather than failing. Same reason dispatch.test.ts fakes
  /// only Date.
  function freezeToMidday(): void {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-17T12:00:00Z'));
  }

  it('pushes the seven-day warning on PENDING_EXPIRATION', async () => {
    await registerPushableDevice();
    freezeToMidday();
    try {
      const { buildApp } = await import('../src/server.js');
      const app = await buildApp();

      expect(await postItemWebhook(app, 'PENDING_EXPIRATION')).toBe(200);

      const { listAnalyticsEvents } = await import('../src/store/analytics.js');
      const sent = await listAnalyticsEvents(testUserId, 'push_sent');
      expect(sent.map((e) => e.properties)).toContainEqual({ type: 'connection_expiring' });

      await app.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('pushes on the already-broken transition too', async () => {
    await registerPushableDevice();
    freezeToMidday();
    try {
      const { buildApp } = await import('../src/server.js');
      const app = await buildApp();

      expect(
        await postItemWebhook(app, 'ERROR', {
          error: {
            error_type: 'ITEM_ERROR',
            error_code: 'ITEM_LOGIN_REQUIRED',
            error_message: 'the login details of this item have changed',
          },
        }),
      ).toBe(200);

      const { listAnalyticsEvents } = await import('../src/store/analytics.js');
      const sent = await listAnalyticsEvents(testUserId, 'push_sent');
      expect(sent.map((e) => e.properties)).toContainEqual({ type: 'connection_broken' });

      await app.close();
    } finally {
      vi.useRealTimers();
    }
  });

  // The per-break rate limit section 8 asks for, and it needs no new state:
  // transitionItemStatus returns early when nothing changed, so a flapping
  // institution resending the same webhook cannot buzz twice.
  it('does not push again when the same webhook repeats', async () => {
    await registerPushableDevice();
    freezeToMidday();
    try {
      const { buildApp } = await import('../src/server.js');
      const app = await buildApp();

      await postItemWebhook(app, 'PENDING_EXPIRATION');
      await postItemWebhook(app, 'PENDING_EXPIRATION');
      await postItemWebhook(app, 'PENDING_DISCONNECT');

      const { listAnalyticsEvents } = await import('../src/store/analytics.js');
      const sent = await listAnalyticsEvents(testUserId, 'push_sent');
      expect(sent.filter((e) => JSON.stringify(e.properties).includes('connection_expiring'))).toHaveLength(1);

      await app.close();
    } finally {
      vi.useRealTimers();
    }
  });

  // THE RULE (vision.md): the creature reacts to what the user controls, never
  // to anything else. A consent timer lapsing is not the user failing at money,
  // so it must not cost the pet health. If this ever fails, the fix is the
  // contract row, not this test.
  it('does not change pet health when a connection breaks', async () => {
    await registerPushableDevice();
    const { getState } = await import('../src/store/pet.js');
    const before = await getState(testUserId);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await postItemWebhook(app, 'PENDING_EXPIRATION');

    const after = await getState(testUserId);
    expect(after.healthScore).toBe(before.healthScore);

    await app.close();
  });

  it('sends no push when the device has no timezone', async () => {
    const { upsertDeviceToken } = await import('../src/store/devices.js');
    await upsertDeviceToken({ token: 'tok_no_tz', platform: 'ios', userId: testUserId });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await postItemWebhook(app, 'PENDING_EXPIRATION');

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    expect(await listAnalyticsEvents(testUserId, 'push_sent')).toHaveLength(0);

    await app.close();
  });

  it('does not downgrade reauth_required to expiring', async () => {
    const { setItemStatus } = await import('../src/store/items.js');
    await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await postItemWebhook(app, 'PENDING_EXPIRATION');

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('reauth_required');

    await app.close();
  });

  it('returns a reauth_required item to healthy on LOGIN_REPAIRED', async () => {
    const { setItemStatus } = await import('../src/store/items.js');
    await setItemStatus(TEST_ITEM_ID, 'reauth_required', { errorCode: 'ITEM_LOGIN_REQUIRED' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const status = await postItemWebhook(app, 'LOGIN_REPAIRED');
    expect(status).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('healthy');
    expect(item?.lastErrorCode).toBeNull();

    await app.close();
  });

  it('does not resurrect a revoked item on LOGIN_REPAIRED', async () => {
    const { setItemStatus, disableItem } = await import('../src/store/items.js');
    await setItemStatus(TEST_ITEM_ID, 'revoked', { errorCode: 'USER_PERMISSION_REVOKED' });
    await disableItem(TEST_ITEM_ID);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await postItemWebhook(app, 'LOGIN_REPAIRED');

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('revoked');
    expect(item?.disabled).toBe(true);

    await app.close();
  });

  it('marks the item reauth_required when a sync fails with ITEM_LOGIN_REQUIRED', async () => {
    mockAgent.get('https://sandbox.plaid.com').intercept({ path: '/transactions/sync', method: 'POST' }).reply(400, {
      error_type: 'ITEM_ERROR',
      error_code: 'ITEM_LOGIN_REQUIRED',
      error_message: 'the login details of this item have changed',
      display_message: null,
      request_id: 'req_broken',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('reauth_required');
    expect(item?.lastErrorCode).toBe('ITEM_LOGIN_REQUIRED');

    await app.close();
  });

  it('ignores an ITEM webhook without an item_id', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({ webhook_type: 'ITEM', webhook_code: 'ERROR' });
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('healthy');

    await app.close();
  });

  it('no-ops for unrecognized ITEM webhook codes without changing status', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const status = await postItemWebhook(app, 'WEBHOOK_UPDATE_ACKNOWLEDGED');
    expect(status).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.status).toBe('healthy');
    expect(item?.disabled).toBe(false);

    await app.close();
  });

  it('no-ops for TRANSACTIONS webhook with non-SYNC_UPDATES_AVAILABLE code', async () => {
    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'INITIAL_UPDATE',
      item_id: TEST_ITEM_ID,
      environment: 'sandbox',
    });
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();
    expect(spy).not.toHaveBeenCalled();

    await app.close();
  });

  it('skips sync for disabled item', async () => {
    const { disableItem } = await import('../src/store/items.js');
    await disableItem(TEST_ITEM_ID);

    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();
    expect(spy).not.toHaveBeenCalled();
    await app.close();
  });

  it('handles has_more pagination — fetches all pages before reacting', async () => {
    const { markInitialSyncComplete } = await import('../src/store/items.js');
    await markInitialSyncComplete(TEST_ITEM_ID);

    const accounts = [
      {
        account_id: 'acc_test_1',
        balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
        name: 'Checking',
        official_name: null,
        type: 'depository',
        subtype: 'checking',
      },
    ];

    // Page 1 — has_more: true
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/transactions/sync', method: 'POST' })
      .reply(200, {
        accounts,
        added: [buildAddedTx({ transaction_id: 'txn_page1', amount: -10 })],
        modified: [],
        removed: [],
        next_cursor: 'cursor-page2',
        has_more: true,
        transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
        request_id: 'req_p1',
      });

    // Page 2 — has_more: false (paycheck triggers reaction)
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/transactions/sync', method: 'POST' })
      .reply(200, {
        accounts,
        added: [buildAddedTx({ transaction_id: 'txn_page2_paycheck', amount: -2400 })],
        modified: [],
        removed: [],
        next_cursor: 'cursor-done',
        has_more: false,
        transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
        request_id: 'req_p2',
      });

    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    await flushAll();

    // Cursor should be updated to last page's cursor.
    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.cursor).toBe('cursor-done');

    await app.close();
  });

  it('logs modified and removed counts without crashing', async () => {
    const { markInitialSyncComplete } = await import('../src/store/items.js');
    await markInitialSyncComplete(TEST_ITEM_ID);

    mockSync({
      accounts: [
        {
          account_id: 'acc_test_1',
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
      ],
      added: [],
      modified: [buildAddedTx({ transaction_id: 'txn_mod_1', amount: -50 })],
      removed: [{ transaction_id: 'txn_removed_1' }],
      next_cursor: 'cursor-mod',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_mod',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();
    // No crash — cursor still advances.
    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.cursor).toBe('cursor-mod');
    await app.close();
  });

  it('calls liabilitiesGet and logs summary on LIABILITIES/DEFAULT_UPDATE', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/liabilities/get', method: 'POST' })
      .reply(200, {
        liabilities: { credit: [{ account_id: 'acc-cc-1' }], student: [], mortgage: [] },
        accounts: [],
        item: {},
        request_id: 'req_liab_1',
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'LIABILITIES',
      webhook_code: 'DEFAULT_UPDATE',
      item_id: TEST_ITEM_ID,
    });
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();
    await app.close();
  });

  it('does not re-apply the bill_overdue side effect when the same LIABILITIES body is redelivered', async () => {
    // 1.7.4: the signature stays valid for five minutes and Plaid redelivers,
    // so without a body-hash claim the health penalty and the push land twice.
    let liabilityCalls = 0;
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/liabilities/get', method: 'POST' })
      .reply(200, () => {
        liabilityCalls++;
        return {
          liabilities: {
            credit: [{ account_id: 'acc-cc-overdue', is_overdue: true }],
            student: [],
            mortgage: [],
          },
          accounts: [],
          item: {},
          request_id: 'req_liab_replay',
        };
      })
      .times(2);

    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { getState } = await import('../src/store/pet.js');
    const before = await getState(testUserId);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'LIABILITIES',
      webhook_code: 'DEFAULT_UPDATE',
      item_id: TEST_ITEM_ID,
    });
    const signed = await signWebhook(body);
    const deliver = () =>
      app.inject({
        method: 'POST',
        url: '/webhooks/plaid',
        headers: { 'content-type': 'application/json', 'plaid-verification': signed },
        body,
      });

    expect((await deliver()).statusCode).toBe(200);
    await flushAll();
    const afterFirst = await getState(testUserId);

    expect((await deliver()).statusCode).toBe(200);
    await flushAll();
    const afterSecond = await getState(testUserId);

    expect(liabilityCalls).toBe(1);
    expect(spy).toHaveBeenCalledOnce();
    expect(afterFirst.healthScore).toBe(before.healthScore - 5);
    expect(afterSecond.healthScore).toBe(afterFirst.healthScore);

    await app.close();
  });

  it('does not re-run the ITEM handler when the same body is redelivered', async () => {
    const itemsModule = await import('../src/store/items.js');
    const statusSpy = vi.spyOn(itemsModule, 'setItemStatus');
    statusSpy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'ITEM',
      webhook_code: 'ERROR',
      item_id: TEST_ITEM_ID,
      error: { error_type: 'ITEM_ERROR', error_code: 'ITEM_LOGIN_REQUIRED' },
    });
    const signed = await signWebhook(body);
    const deliver = () =>
      app.inject({
        method: 'POST',
        url: '/webhooks/plaid',
        headers: { 'content-type': 'application/json', 'plaid-verification': signed },
        body,
      });

    expect((await deliver()).statusCode).toBe(200);
    await flushAll();
    expect((await deliver()).statusCode).toBe(200);
    await flushAll();

    expect(statusSpy).toHaveBeenCalledOnce();
    const { getItem } = await import('../src/store/items.js');
    expect((await getItem(TEST_ITEM_ID))?.status).toBe('reauth_required');

    statusSpy.mockRestore();
    await app.close();
  });

  it('still syncs on a redelivered TRANSACTIONS body — the replay guard skips the idempotent path', async () => {
    // The guard must never gate the sync path: `claimEvent` per transaction id
    // and the cursor already make it idempotent, and a redelivery is a normal
    // way for the next batch of transactions to arrive.
    const { markInitialSyncComplete } = await import('../src/store/items.js');
    await markInitialSyncComplete(TEST_ITEM_ID);

    const accounts = [
      {
        account_id: 'acc_test_1',
        balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
        name: 'Checking',
        official_name: null,
        type: 'depository',
        subtype: 'checking',
      },
    ];
    mockSync({
      accounts,
      added: [buildAddedTx({ transaction_id: 'txn_redeliver_1' })],
      modified: [],
      removed: [],
      next_cursor: 'cursor-redeliver-1',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_redeliver_1',
    });
    mockSync({
      accounts,
      added: [buildAddedTx({ transaction_id: 'txn_redeliver_2' })],
      modified: [],
      removed: [],
      next_cursor: 'cursor-redeliver-2',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_redeliver_2',
    });

    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);
    const deliver = () =>
      app.inject({
        method: 'POST',
        url: '/webhooks/plaid',
        headers: { 'content-type': 'application/json', 'plaid-verification': signed },
        body,
      });

    await deliver();
    await flushAll();
    await deliver();
    await flushAll();

    // The second delivery ran a full sync: the cursor advanced past the first.
    const { getItem } = await import('../src/store/items.js');
    expect((await getItem(TEST_ITEM_ID))?.cursor).toBe('cursor-redeliver-2');
    // And both transactions reacted, one per unique transaction id.
    expect(spy).toHaveBeenCalledTimes(2);

    await app.close();
  });

  it('calls recurringTransactionsGet and logs summary on RECURRING_TRANSACTIONS_UPDATE', async () => {
    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/transactions/recurring/get', method: 'POST' })
      .reply(200, {
        inflow_streams: [
          {
            stream_id: 's-1',
            account_id: 'acc-1',
            description: 'Paycheck',
            frequency: 'WEEKLY',
            is_user_modified: false,
            merchant_name: null,
            average_amount: { amount: 2400 },
          },
        ],
        outflow_streams: [],
        request_id: 'req_rec_1',
      });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'RECURRING_TRANSACTIONS_UPDATE',
      item_id: TEST_ITEM_ID,
    });
    const signed = await signWebhook(body);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();
    await app.close();
  });

  it('flags NEW_ACCOUNTS_AVAILABLE without touching health or disabling the item', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const status = await postItemWebhook(app, 'NEW_ACCOUNTS_AVAILABLE');
    expect(status).toBe(200);

    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
    expect(item?.disabled).toBe(false);
    expect(item?.status).toBe('healthy');
    expect(item?.newAccountsAvailable).toBe(true);

    await app.close();
  });

  it('concurrent webhooks for same item — both return 200 and only dispatch once per unique tx', async () => {
    const { markInitialSyncComplete } = await import('../src/store/items.js');
    await markInitialSyncComplete(TEST_ITEM_ID);

    const syncResponse = {
      accounts: [
        {
          account_id: 'acc_test_1',
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
      ],
      added: [buildAddedTx({ transaction_id: 'txn_concurrent' })],
      modified: [],
      removed: [],
      next_cursor: 'cursor-concurrent',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_concurrent',
    };
    // Queue two responses for two concurrent Plaid sync calls.
    mockSync(syncResponse);
    mockSync(syncResponse);

    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = buildSyncEnvelope();
    const signed = await signWebhook(body);

    // Fire two webhooks simultaneously.
    const [res1, res2] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/webhooks/plaid',
        headers: { 'content-type': 'application/json', 'plaid-verification': signed },
        body,
      }),
      app.inject({
        method: 'POST',
        url: '/webhooks/plaid',
        headers: { 'content-type': 'application/json', 'plaid-verification': signed },
        body,
      }),
    ]);

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    await flushAll();

    // claimEvent idempotency gate must prevent double-dispatch.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(1);
    await app.close();
  });
});
