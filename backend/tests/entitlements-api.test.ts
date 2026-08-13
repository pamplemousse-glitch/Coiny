import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setTrustedRootsForTesting } from '../src/appstore/roots.js';
import { generateChain, signJws, type TestChain, transactionPayload } from './appstore-helper.js';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

let chain: TestChain;

beforeAll(() => {
  chain = generateChain();
  setTrustedRootsForTesting(chain.roots);
});

afterAll(() => {
  setTrustedRootsForTesting(null);
});

async function makeApp() {
  const { buildApp } = await import('../src/server.js');
  return buildApp();
}

describe('GET /api/entitlements', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 401 without auth', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/entitlements' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('defaults a new user to the free tier with its limits', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/entitlements', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tier).toBe('free');
    expect(body.limits).toEqual({ liveConnections: 2, activeGoals: 1, guardrails: 2, historyDays: 30 });
    expect(body.appAccountToken).toMatch(/^[0-9a-f-]{36}$/);
    await app.close();
  });

  it('returns the same appAccountToken on every read', async () => {
    const app = await makeApp();
    const first = await app.inject({ method: 'GET', url: '/api/entitlements', headers: authHeader() });
    const second = await app.inject({ method: 'GET', url: '/api/entitlements', headers: authHeader() });
    expect(second.json().appAccountToken).toBe(first.json().appAccountToken);
    await app.close();
  });
});

describe('POST /api/entitlements/transaction', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('grants the individual tier from a verified transaction', async () => {
    const app = await makeApp();
    const jws = signJws(transactionPayload({ originalTransactionId: 'orig_api_1' }), chain);
    const res = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: authHeader(),
      payload: { jws },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tier).toBe('individual');

    const read = await app.inject({ method: 'GET', url: '/api/entitlements', headers: authHeader() });
    expect(read.json().tier).toBe('individual');
    await app.close();
  });

  it('grants the household tier for a household product', async () => {
    const app = await makeApp();
    const jws = signJws(
      transactionPayload({ originalTransactionId: 'orig_api_hh', productId: 'app.coiny.household.annual' }),
      chain,
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: authHeader(),
      payload: { jws },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tier).toBe('household');
    await app.close();
  });

  it('rejects a transaction whose signature does not verify', async () => {
    const app = await makeApp();
    const jws = signJws(transactionPayload(), chain, { breakSignature: true });
    const res = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: authHeader(),
      payload: { jws },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects a transaction for another app bundle', async () => {
    const app = await makeApp();
    const jws = signJws(transactionPayload({ bundleId: 'com.other.app' }), chain);
    const res = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: authHeader(),
      payload: { jws },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects an unknown product id', async () => {
    const app = await makeApp();
    const jws = signJws(transactionPayload({ productId: 'app.coiny.lifetime.gold' }), chain);
    const res = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: authHeader(),
      payload: { jws },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('unknown_product');
    await app.close();
  });

  it('refuses a subscription already bound to a different user', async () => {
    const app = await makeApp();
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { createSession } = await import('../src/store/sessions.js');
    const otherUserId = await findOrCreateUser({ appleSub: 'other_sub', email: 'other@coiny.test' });
    const { rawToken: otherToken } = await createSession(otherUserId);

    const jws = signJws(transactionPayload({ originalTransactionId: 'orig_shared' }), chain);
    const first = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: authHeader(),
      payload: { jws },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { jws },
    });
    expect(second.statusCode).toBe(409);

    // The rightful owner re-reporting (restore, new device) still succeeds.
    const restore = await app.inject({
      method: 'POST',
      url: '/api/entitlements/transaction',
      headers: authHeader(),
      payload: { jws },
    });
    expect(restore.statusCode).toBe(200);
    await app.close();
  });
});

describe('the connection gate over HTTP', () => {
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

  it('refuses a link token past the free limit with the paywall cue', async () => {
    const app = await makeApp();
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item_1', accessToken: 'a1', userId: testUserId });
    await upsertItem({ itemId: 'item_2', accessToken: 'a2', userId: testUserId });

    const res = await app.inject({ method: 'POST', url: '/api/plaid/link-token', headers: authHeader() });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'connection_limit', tier: 'free', limit: 2 });
    await app.close();
  });

  it('issues a link token below the free limit', async () => {
    const app = await makeApp();
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item_1', accessToken: 'a1', userId: testUserId });

    mockAgent
      .get('https://sandbox.plaid.com')
      .intercept({ path: '/link/token/create', method: 'POST' })
      .reply(200, { link_token: 'link-sandbox-test', expiration: '2026-08-13T23:59:59Z' });

    const res = await app.inject({ method: 'POST', url: '/api/plaid/link-token', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json().link_token).toBe('link-sandbox-test');
    await app.close();
  });

  it('refuses a token exchange past the free limit', async () => {
    const app = await makeApp();
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item_1', accessToken: 'a1', userId: testUserId });
    await upsertItem({ itemId: 'item_2', accessToken: 'a2', userId: testUserId });

    const res = await app.inject({
      method: 'POST',
      url: '/api/plaid/exchange-token',
      headers: authHeader(),
      payload: { public_token: 'public-sandbox-abc' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('connection_limit');
    await app.close();
  });
});
