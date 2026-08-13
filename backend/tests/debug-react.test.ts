import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('POST /api/debug/react', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/debug/react?animation=celebrate' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('triggers a celebrate reaction and persists it to history', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/debug/react?animation=celebrate',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ ok: boolean; reaction: { animation: string; reason: string } }>();
    expect(body.ok).toBe(true);
    expect(body.reaction.animation).toBe('celebrate');
    expect(body.reaction.reason).toBe('(debug) celebrate');

    // The reaction must have been recorded (and encrypted) in history.
    const petRes = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    const pet = petRes.json<{ reactionHistory: { eventType: string; reaction: { animation: string } }[] }>();
    expect(pet.reactionHistory).toHaveLength(1);
    expect(pet.reactionHistory[0]?.eventType).toBe('debug');
    expect(pet.reactionHistory[0]?.reaction.animation).toBe('celebrate');

    await app.close();
  });

  it('accepts every supported animation preset', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    for (const animation of ['happy', 'sad', 'celebrate', 'concerned', 'neutral', 'sleeping']) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/debug/react?animation=${animation}`,
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ reaction: { animation: string } }>().reaction.animation).toBe(animation);
    }

    await app.close();
  });

  it('returns 400 for an unknown animation', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/debug/react?animation=explode',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when the animation query param is missing', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/debug/react', headers: authHeader() });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('GET /api/debug/transactions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns empty array when no transactions have been ingested', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/debug/transactions', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ transactions: unknown[] }>().transactions).toHaveLength(0);

    await app.close();
  });

  it('returns ingested transactions with category and rule_matched fields', async () => {
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');
    const today = new Date().toISOString().slice(0, 10);
    await db()
      .insert(transactions)
      .values([
        {
          transactionId: 'txn_groceries',
          userId: testUserId,
          accountId: 'acc1',
          merchantName: 'Whole Foods',
          amount: '-185.00',
          date: today,
          category: 'groceries',
        },
        {
          transactionId: 'txn_paycheck',
          userId: testUserId,
          accountId: 'acc1',
          merchantName: 'Employer Inc',
          amount: '2400.00',
          date: today,
          category: 'paycheck',
        },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/debug/transactions', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    type TxRow = { id: string; category: string | null; rule_matched: string | null };
    const body = res.json<{ transactions: TxRow[] }>();
    expect(body.transactions).toHaveLength(2);

    const groceries = body.transactions.find((t) => t.id === 'txn_groceries');
    expect(groceries?.category).toBe('groceries');
    // R-7.24 rename: overspent_in_category is now overspend_vs_plan.
    expect(groceries?.rule_matched).toBe('overspend_vs_plan');

    const paycheck = body.transactions.find((t) => t.id === 'txn_paycheck');
    expect(paycheck?.category).toBe('paycheck');
    expect(paycheck?.rule_matched).toBe('paycheck_received');

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/debug/transactions' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /api/debug/reset-cursor', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns ok with zero items when no bank is linked', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/debug/reset-cursor', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean; items_reset: number }>().items_reset).toBe(0);

    await app.close();
  });

  it('resets cursor to null for linked items', async () => {
    const { upsertItem, setCursor, getItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item_reset_test', accessToken: 'tok', userId: testUserId });
    await setCursor('item_reset_test', 'cursor-abc');

    const before = await getItem('item_reset_test');
    expect(before?.cursor).toBe('cursor-abc');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/debug/reset-cursor', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ items_reset: number }>().items_reset).toBe(1);

    const after = await getItem('item_reset_test');
    expect(after?.cursor).toBeNull();

    await app.close();
  });

  it('clears processedEvents for user transactions', async () => {
    const { db } = await import('../src/db/client.js');
    const { transactions, processedEvents } = await import('../src/db/schema.js');
    await db().insert(transactions).values({
      transactionId: 'txn_to_clear',
      userId: testUserId,
      accountId: 'acc1',
      amount: '-10.00',
      date: '2026-05-20',
      category: 'groceries',
    });
    await db().insert(processedEvents).values({ id: 'txn_to_clear' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/debug/reset-cursor', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    // The event should be gone so it can be re-claimed.
    const { claimEvent } = await import('../src/store/events.js');
    const canClaim = await claimEvent('txn_to_clear');
    expect(canClaim).toBe(true);

    await app.close();
  });
});
