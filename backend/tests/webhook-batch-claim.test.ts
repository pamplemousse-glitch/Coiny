import { createHash, webcrypto } from 'node:crypto';

import { exportJWK, type JWK, SignJWT } from 'jose';
import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Reactions are stubbed so this file can make one specific transaction fail.
// The rest of the webhook path stays real: signature verification, the sync
// call, adaptation and the claim itself.
const performReactions = vi.fn(async (_userId: string, _matches: unknown[]) => undefined);
vi.mock('../src/reactions/perform.js', () => ({
  performReactions: (userId: string, matches: unknown[]) => performReactions(userId, matches),
}));
vi.mock('../src/push/apns.js', () => ({
  sendApnsPush: vi.fn(async () => undefined),
}));

import { resetDatabase, testUserId } from './db-helper.js';

async function flushAll() {
  const { awaitWebhookWork } = await import('../src/webhook/plaid.js');
  await awaitWebhookWork();
}

const TEST_KID = 'test-kid-batch';
const TEST_ITEM_ID = 'item_batch_1';
const TEST_ACCESS_TOKEN = 'access-sandbox-batch';

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
  performReactions.mockReset();
  performReactions.mockResolvedValue(undefined);

  const { _clearKeyCache, setKeyFetcher } = await import('../src/plaid/signature.js');
  _clearKeyCache();
  setKeyFetcher(async (kid) => {
    if (kid !== TEST_KID) throw new Error(`unknown kid in test: ${kid}`);
    return { ...publicJwk, kty: 'EC', crv: 'P-256', created_at: 0, expired_at: null } as never;
  });

  const { upsertItem, markInitialSyncComplete } = await import('../src/store/items.js');
  await upsertItem({ itemId: TEST_ITEM_ID, accessToken: TEST_ACCESS_TOKEN, userId: testUserId });
  // Rule evaluation is skipped entirely on the initial sync, and the claim
  // path under test lives on the other side of that branch.
  await markInitialSyncComplete(TEST_ITEM_ID);

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

function paycheck(id: string) {
  return {
    transaction_id: id,
    account_id: 'acc_batch_1',
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
  };
}

async function deliverSync(added: object[]) {
  mockAgent
    .get('https://sandbox.plaid.com')
    .intercept({ path: '/transactions/sync', method: 'POST' })
    .reply(200, {
      accounts: [
        {
          account_id: 'acc_batch_1',
          balances: { available: 1000, current: 1000, iso_currency_code: 'USD' },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
      ],
      added,
      modified: [],
      removed: [],
      next_cursor: 'cursor_batch',
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_batch',
    });

  const body = JSON.stringify({
    webhook_type: 'TRANSACTIONS',
    webhook_code: 'SYNC_UPDATES_AVAILABLE',
    item_id: TEST_ITEM_ID,
    environment: 'sandbox',
  });

  const { buildApp } = await import('../src/server.js');
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/webhooks/plaid',
    headers: { 'plaid-verification': await signWebhook(body), 'content-type': 'application/json' },
    payload: body,
  });
  await flushAll();
  await app.close();
  return res;
}

/** Whether an id is still claimable, i.e. NOT currently marked processed. */
async function isClaimable(id: string): Promise<boolean> {
  const { claimEvents } = await import('../src/store/events.js');
  return (await claimEvents([id])).has(id);
}

describe('batched transaction claiming (audit 4.7.10)', () => {
  it('marks every processed transaction as claimed', async () => {
    const res = await deliverSync([paycheck('txn_ok_1'), paycheck('txn_ok_2')]);

    expect(res.statusCode).toBe(200);
    expect(await isClaimable('txn_ok_1')).toBe(false);
    expect(await isClaimable('txn_ok_2')).toBe(false);
  });

  it('does not re-evaluate a transaction it has already processed', async () => {
    await deliverSync([paycheck('txn_repeat')]);
    const firstPass = performReactions.mock.calls.length;
    expect(firstPass).toBeGreaterThan(0);

    performReactions.mockClear();
    await deliverSync([paycheck('txn_repeat')]);

    expect(performReactions).not.toHaveBeenCalled();
  });

  // The guarantee the old per-id claim gave for free. Claiming the whole batch
  // up front would otherwise mark transactions processed whose reactions never
  // ran, and Plaid's redelivery would skip them in silence.
  it('releases the transactions it claimed but never processed', async () => {
    performReactions.mockImplementation(async () => {
      throw new Error('reaction dispatch exploded');
    });

    await deliverSync([paycheck('txn_boom_1'), paycheck('txn_boom_2'), paycheck('txn_boom_3')]);

    // The first one threw, so nothing in the batch completed and all three
    // have to be retryable on redelivery.
    expect(await isClaimable('txn_boom_1')).toBe(true);
    expect(await isClaimable('txn_boom_2')).toBe(true);
    expect(await isClaimable('txn_boom_3')).toBe(true);
  });

  it('keeps the transactions that did complete before a later one failed', async () => {
    let seen = 0;
    performReactions.mockImplementation(async () => {
      seen += 1;
      if (seen > 1) throw new Error('reaction dispatch exploded on the second');
    });

    await deliverSync([paycheck('txn_mixed_1'), paycheck('txn_mixed_2'), paycheck('txn_mixed_3')]);

    // The first completed, so re-processing it would double-react.
    expect(await isClaimable('txn_mixed_1')).toBe(false);
    // The second threw and the third never ran; both must come back.
    expect(await isClaimable('txn_mixed_2')).toBe(true);
    expect(await isClaimable('txn_mixed_3')).toBe(true);
  });
});
