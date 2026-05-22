import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

describe('claimEvent', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns true for the first claim of an id', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    expect(await claimEvent('evt_new')).toBe(true);
  });

  it('returns false on a re-claim of the same id', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    await claimEvent('evt_a');
    expect(await claimEvent('evt_a')).toBe(false);
  });

  it('does not affect other ids', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    await claimEvent('evt_x');
    expect(await claimEvent('evt_y')).toBe(true);
  });

  it('atomically resolves concurrent claims of the same id', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    // Fire two claims in parallel; PK + onConflictDoNothing guarantees one wins.
    const results = await Promise.all([claimEvent('evt_race'), claimEvent('evt_race')]);
    const wins = results.filter(Boolean).length;
    expect(wins).toBe(1);
  });
});

describe('health score', () => {
  it('returns correct deltas for all known event types', async () => {
    const { deltaForEvent } = await import('../src/health/score.js');
    expect(deltaForEvent('paycheck_received')).toBe(10);
    expect(deltaForEvent('bill_paid_on_time')).toBe(5);
    expect(deltaForEvent('savings_milestone')).toBe(15);
    expect(deltaForEvent('overspent_in_category')).toBe(-10);
    expect(deltaForEvent('large_purchase')).toBe(-5);
  });

  it('returns 0 for an unknown event type', async () => {
    const { deltaForEvent } = await import('../src/health/score.js');
    expect(deltaForEvent('unknown_event')).toBe(0);
  });
});

describe('persistTransactions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists transactions and they are retrievable', async () => {
    const { persistTransactions, getRecentOutflows } = await import('../src/store/transactions.js');
    const tx = {
      id: 'txn_store_1',
      account_id: 'acc_1',
      amount: '-42.50',
      date: new Date().toISOString().slice(0, 10),
      running_balance: null,
      details: { category: 'groceries', counterparty: { name: 'Whole Foods' } },
    };
    await persistTransactions(testUserId, [tx]);
    const rows = await getRecentOutflows(testUserId, 7);
    expect(rows.some((r) => r.transactionId === 'txn_store_1')).toBe(true);
  });

  it('onConflictDoNothing — duplicate tx_id does not throw or duplicate row', async () => {
    const { persistTransactions, getRecentOutflows } = await import('../src/store/transactions.js');
    const tx = {
      id: 'txn_dup',
      account_id: 'acc_1',
      amount: '-10.00',
      date: new Date().toISOString().slice(0, 10),
      running_balance: null,
      details: null,
    };
    await persistTransactions(testUserId, [tx]);
    await persistTransactions(testUserId, [tx]); // second insert — must not throw
    const rows = await getRecentOutflows(testUserId, 7);
    expect(rows.filter((r) => r.transactionId === 'txn_dup')).toHaveLength(1);
  });

  it('no-ops on empty array', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');
    await expect(persistTransactions(testUserId, [])).resolves.toBeUndefined();
  });

  it('only returns outflows (negative amounts) from getRecentOutflows', async () => {
    const { persistTransactions, getRecentOutflows } = await import('../src/store/transactions.js');
    const today = new Date().toISOString().slice(0, 10);
    await persistTransactions(testUserId, [
      { id: 'txn_credit', account_id: 'acc_1', amount: '2400.00', date: today, running_balance: null, details: null },
      { id: 'txn_debit', account_id: 'acc_1', amount: '-50.00', date: today, running_balance: null, details: null },
    ]);
    const rows = await getRecentOutflows(testUserId, 7);
    expect(rows.some((r) => r.transactionId === 'txn_credit')).toBe(false);
    expect(rows.some((r) => r.transactionId === 'txn_debit')).toBe(true);
  });
});

describe('pet state defaults', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('new user has healthScore 50 and empty reaction history', async () => {
    const { getState } = await import('../src/store/pet.js');
    const state = await getState(testUserId);
    expect(state.healthScore).toBe(50);
    expect(state.reactionHistory).toHaveLength(0);
    expect(state.lastReactionAt).toBeNull();
  });

  it('applyHealthDelta clamps score to [0, 100]', async () => {
    const { applyHealthDelta, getState } = await import('../src/store/pet.js');
    // Drive score to max.
    for (let i = 0; i < 10; i++) await applyHealthDelta(testUserId, 10);
    const high = await getState(testUserId);
    expect(high.healthScore).toBeLessThanOrEqual(100);

    // Drive score to min.
    for (let i = 0; i < 20; i++) await applyHealthDelta(testUserId, -15);
    const low = await getState(testUserId);
    expect(low.healthScore).toBeGreaterThanOrEqual(0);
  });

  it('concurrent applyHealthDelta calls serialize correctly', async () => {
    const { applyHealthDelta, getState } = await import('../src/store/pet.js');
    // 10 concurrent +1 deltas starting from 50 → should land at 60 (not less due to lost updates).
    await Promise.all(Array.from({ length: 10 }, () => applyHealthDelta(testUserId, 1)));
    const state = await getState(testUserId);
    // With optimistic concurrency each +1 must apply; final score must be 60.
    expect(state.healthScore).toBe(60);
  });
});
