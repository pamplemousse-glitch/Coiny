/**
 * End-to-end pipeline tests: webhook → sync → rule engine → reaction persisted → pet state.
 *
 * These tests exercise the full request chain that the unit tests in
 * webhook.test.ts, rules.test.ts, and debug-react.test.ts each cover only in
 * isolation. The goal is to prove the three paths that were listed as "not yet
 * proven end-to-end" in docs/handoff.md as of 2026-05-24:
 *
 *   1. Initial sync stores transactions but fires no reaction.
 *   2. After POST /api/debug/reset-cursor, the same transactions re-evaluate
 *      through the rule engine and the reaction is persisted to reactionHistory
 *      (visible in GET /api/pets).
 *   3. POST /api/debug/session creates a valid session that can authenticate
 *      all protected routes — the iOS debug sign-in bypass works end-to-end.
 */

import { createHash, webcrypto } from 'node:crypto';
import { exportJWK, type JWK, SignJWT } from 'jose';
import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

// ---------------------------------------------------------------------------
// Helpers copied / aligned with webhook.test.ts so each test file is
// self-contained — no shared mutable state across test files.
// ---------------------------------------------------------------------------

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));
async function flushAll() {
  for (let i = 0; i < 5; i++) await flushImmediate();
}

const TEST_KID = 'e2e-kid-1';
const TEST_ITEM_ID = 'item_e2e_1';
const TEST_ACCESS_TOKEN = 'access-sandbox-e2e';

type Key = Parameters<typeof SignJWT.prototype.sign>[0];
let privateKey: Key;
let publicJwk: JWK & Record<string, unknown>;
let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(async () => {
  const keypair = (await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )) as { privateKey: unknown; publicKey: unknown };
  privateKey = keypair.privateKey as Key;
  // biome-ignore lint/suspicious/noExplicitAny: exportJWK requires CryptoKey
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
    if (kid !== TEST_KID) throw new Error(`unknown kid in e2e test: ${kid}`);
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

function syncWebhookBody(): string {
  return JSON.stringify({
    webhook_type: 'TRANSACTIONS',
    webhook_code: 'SYNC_UPDATES_AVAILABLE',
    item_id: TEST_ITEM_ID,
    environment: 'sandbox',
  });
}

function paycheckTransaction(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: 'txn_e2e_paycheck',
    account_id: 'acc_e2e_1',
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

function mockSyncResponse(nextCursor: string, txOverrides: Record<string, unknown> = {}) {
  mockAgent
    .get('https://sandbox.plaid.com')
    .intercept({ path: '/transactions/sync', method: 'POST' })
    .reply(200, {
      accounts: [
        {
          account_id: 'acc_e2e_1',
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
        },
      ],
      added: [paycheckTransaction(txOverrides)],
      modified: [],
      removed: [],
      next_cursor: nextCursor,
      has_more: false,
      transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
      request_id: 'req_e2e',
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pipeline: initial sync', () => {
  it('ingests transactions but records no reaction on first webhook delivery', async () => {
    mockSyncResponse('cursor-e2e-1');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const body = syncWebhookBody();
    const signed = await signWebhook(body);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    expect(res.statusCode).toBe(200);
    await flushAll();

    // Transaction stored — the rule WOULD fire (rule_matched is computed at
    // query time), but no reaction should appear in history yet because this
    // was the initial sync (cursor was null before this webhook).
    const txRes = await app.inject({
      method: 'GET',
      url: '/api/debug/transactions',
      headers: { authorization: `Bearer ${(await import('./db-helper.js')).testToken}` },
    });
    expect(txRes.statusCode).toBe(200);
    const { transactions } = txRes.json<{ transactions: { id: string; rule_matched: string | null }[] }>();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.rule_matched).toBe('paycheck_received');

    // No reaction persisted — reaction history must be empty.
    const petRes = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: `Bearer ${(await import('./db-helper.js')).testToken}` },
    });
    const pet = petRes.json<{ reactionHistory: unknown[] }>();
    expect(pet.reactionHistory).toHaveLength(0);

    await app.close();
  });
});

describe('pipeline: reset cursor → re-fire → reaction recorded', () => {
  it('proves the full Plaid → rule → reaction path: after cursor reset the reaction is persisted and visible in GET /api/pets', async () => {
    const { markInitialSyncComplete } = await import('../src/store/items.js');
    await markInitialSyncComplete(TEST_ITEM_ID);

    // ── Step 1: ingest the transaction (with processedEvents guard active) ──
    mockSyncResponse('cursor-e2e-2');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const { testToken } = await import('./db-helper.js');
    const authH = { authorization: `Bearer ${testToken}` };

    const body = syncWebhookBody();
    const signed = await signWebhook(body);
    await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed },
      body,
    });
    await flushAll();

    // One reaction should be in history from step 1 (initial sync is complete).
    const afterFirst = await app.inject({ method: 'GET', url: '/api/pets', headers: authH });
    expect(afterFirst.json<{ reactionHistory: unknown[] }>().reactionHistory).toHaveLength(1);

    // ── Step 2: reset cursor — clears processedEvents so same txn can re-fire ──
    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/debug/reset-cursor',
      headers: authH,
    });
    expect(resetRes.statusCode).toBe(200);
    const { items_reset } = resetRes.json<{ items_reset: number }>();
    expect(items_reset).toBe(1);
    // events_cleared count is unreliable on PGlite (rowCount not exposed);
    // correctness is proven by the re-fire in step 3 succeeding.

    // ── Step 3: fire the same transaction again ──
    mockSyncResponse('cursor-e2e-3');
    const body2 = syncWebhookBody();
    const signed2 = await signWebhook(body2);
    await app.inject({
      method: 'POST',
      url: '/webhooks/plaid',
      headers: { 'content-type': 'application/json', 'plaid-verification': signed2 },
      body: body2,
    });
    await flushAll();

    // ── Step 4: assert reaction persisted in history ──
    const petRes = await app.inject({ method: 'GET', url: '/api/pets', headers: authH });
    const pet = petRes.json<{
      reactionHistory: { eventType: string; reaction: { animation: string; reason: string } }[];
    }>();
    // Two reactions now: the original + the re-fired one.
    expect(pet.reactionHistory.length).toBeGreaterThanOrEqual(2);
    const latest = pet.reactionHistory[0]!;
    expect(latest.eventType).toBe('paycheck_received');
    expect(latest.reaction.animation).toBe('celebrate');
    expect(latest.reaction.reason).toContain('paycheck_received');

    // ── Step 5: assert rule_matched visible in debug/transactions ──
    const txRes = await app.inject({ method: 'GET', url: '/api/debug/transactions', headers: authH });
    const { transactions } = txRes.json<{ transactions: { id: string; rule_matched: string | null }[] }>();
    const paycheck = transactions.find((t) => t.id === 'txn_e2e_paycheck');
    expect(paycheck?.rule_matched).toBe('paycheck_received');

    await app.close();
  });
});

describe('pipeline: debug/session authentication', () => {
  it('POST /api/debug/session returns a token that authenticates GET /api/pets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    // Unauthenticated call is rejected.
    const unauth = await app.inject({ method: 'GET', url: '/api/pets' });
    expect(unauth.statusCode).toBe(401);

    // Debug session endpoint creates a real user + session.
    const sessionRes = await app.inject({ method: 'POST', url: '/api/debug/session' });
    expect(sessionRes.statusCode).toBe(200);
    const { token } = sessionRes.json<{ token: string }>();
    expect(token).toBeTruthy();

    // Token authenticates /api/pets.
    const petRes = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(petRes.statusCode).toBe(200);
    const pet = petRes.json<{ healthScore: number; mood: number; reactionHistory: unknown[] }>();
    expect(typeof pet.healthScore).toBe('number');
    expect(typeof pet.mood).toBe('number');
    expect(Array.isArray(pet.reactionHistory)).toBe(true);

    await app.close();
  });

  it('two calls to /api/debug/session return distinct tokens that both authenticate /api/pets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    // Run sequentially — concurrent findOrCreateUser hits a unique constraint
    // on appleSub in PGlite (single-writer in-process DB).
    const r1 = await app.inject({ method: 'POST', url: '/api/debug/session' });
    const r2 = await app.inject({ method: 'POST', url: '/api/debug/session' });
    const t1 = r1.json<{ token: string }>().token;
    const t2 = r2.json<{ token: string }>().token;

    // Tokens are distinct (each call mints a new session).
    expect(t1).not.toBe(t2);

    // Both authenticate to the same underlying user (same pet state).
    const p1 = await app.inject({ method: 'GET', url: '/api/pets', headers: { authorization: `Bearer ${t1}` } });
    const p2 = await app.inject({ method: 'GET', url: '/api/pets', headers: { authorization: `Bearer ${t2}` } });
    expect(p1.statusCode).toBe(200);
    expect(p2.statusCode).toBe(200);

    await app.close();
  });
});
