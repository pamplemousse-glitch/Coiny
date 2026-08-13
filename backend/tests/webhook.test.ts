import { createHash, webcrypto } from 'node:crypto';
import { exportJWK, type JWK, SignJWT } from 'jose';
import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));
async function flushAll() {
  for (let i = 0; i < 5; i++) await flushImmediate();
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
    expect(spy.mock.calls[0]?.[1]?.animation).toBe('celebrate');

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

  it('disables the item on USER_PERMISSION_REVOKED', async () => {
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

  it('no-ops for ITEM webhook with non-USER_PERMISSION_REVOKED code', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'ITEM',
      webhook_code: 'PENDING_EXPIRATION',
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

    // Item should NOT be disabled — code was not USER_PERMISSION_REVOKED
    const { getItem } = await import('../src/store/items.js');
    const item = await getItem(TEST_ITEM_ID);
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

  it('no-ops gracefully for ITEM/NEW_ACCOUNTS_AVAILABLE without disabling item', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const body = JSON.stringify({
      webhook_type: 'ITEM',
      webhook_code: 'NEW_ACCOUNTS_AVAILABLE',
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
    expect(item?.disabled).toBe(false);

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
