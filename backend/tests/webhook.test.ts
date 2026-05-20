import { createHash, webcrypto } from 'node:crypto';
import { exportJWK, type JWK, SignJWT } from 'jose';
import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase } from './db-helper.js';

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));
async function flushAll() {
  for (let i = 0; i < 5; i++) await flushImmediate();
}

const TEST_KID = 'test-kid-1';
const TEST_ITEM_ID = 'item_test_1';
const TEST_ACCESS_TOKEN = 'access-sandbox-test';

// webcrypto.subtle.generateKey returns CryptoKey | CryptoKeyPair depending on alg;
// for ECDSA it's always a pair.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicJwk = (await exportJWK(keypair.publicKey as any)) as JWK & Record<string, unknown>;
  publicJwk['kid'] = TEST_KID;
  publicJwk['alg'] = 'ES256';
  publicJwk['use'] = 'sig';
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
  await upsertItem({ itemId: TEST_ITEM_ID, accessToken: TEST_ACCESS_TOKEN });

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
    expect(spy.mock.calls[0]?.[0]?.animation).toBe('celebrate');

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
});
