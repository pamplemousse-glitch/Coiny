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

describe('claimWebhookDelivery', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns true for the first claim of a body hash', async () => {
    const { claimWebhookDelivery } = await import('../src/store/events.js');
    expect(await claimWebhookDelivery('plaid_webhook:hash_a')).toBe(true);
  });

  it('returns false on a re-claim inside the window', async () => {
    const { claimWebhookDelivery } = await import('../src/store/events.js');
    await claimWebhookDelivery('plaid_webhook:hash_b');
    expect(await claimWebhookDelivery('plaid_webhook:hash_b')).toBe(false);
  });

  it('returns true again once the claim window has passed', async () => {
    const { claimWebhookDelivery } = await import('../src/store/events.js');
    const now = Date.now();
    await claimWebhookDelivery('plaid_webhook:hash_c', now);
    // A byte-identical LIABILITIES body arriving days later is a genuine
    // update, not a replay: the claim must have expired by then.
    expect(await claimWebhookDelivery('plaid_webhook:hash_c', now + 11 * 60 * 1000)).toBe(true);
  });

  it('atomically resolves concurrent claims of the same body hash', async () => {
    const { claimWebhookDelivery } = await import('../src/store/events.js');
    const results = await Promise.all([
      claimWebhookDelivery('plaid_webhook:hash_race'),
      claimWebhookDelivery('plaid_webhook:hash_race'),
    ]);
    expect(results.filter(Boolean).length).toBe(1);
  });

  it('releaseWebhookDelivery lets the same body be claimed again', async () => {
    const { claimWebhookDelivery, releaseWebhookDelivery } = await import('../src/store/events.js');
    await claimWebhookDelivery('plaid_webhook:hash_d');
    await releaseWebhookDelivery('plaid_webhook:hash_d');
    expect(await claimWebhookDelivery('plaid_webhook:hash_d')).toBe(true);
  });

  it('does not collide with a transaction id claimed by claimEvent', async () => {
    const { claimEvent, claimWebhookDelivery } = await import('../src/store/events.js');
    await claimEvent('txn_shared_table');
    expect(await claimWebhookDelivery('plaid_webhook:txn_shared_table')).toBe(true);
  });
});

describe('health score', () => {
  // Event names and magnitudes follow the R-7.24 taxonomy (the reaction
  // contract is the source of truth; tests/score.test.ts covers the detail).
  // savings_milestone became contribution_made, overspent_in_category became
  // overspend_vs_plan (softened to -5), large_purchase carries no penalty.
  it('returns correct deltas for all known event types', async () => {
    const { deltaForEvent } = await import('../src/health/score.js');
    expect(deltaForEvent('paycheck_received')).toBe(10);
    expect(deltaForEvent('bill_paid_on_time')).toBe(5);
    expect(deltaForEvent('contribution_made')).toBe(10);
    expect(deltaForEvent('overspend_vs_plan')).toBe(-5);
    expect(deltaForEvent('large_purchase')).toBe(0);
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
      description: 'Whole Foods',
      status: 'posted' as const,
      type: 'debit',
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
      description: 'Test',
      status: 'posted' as const,
      type: 'debit',
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
      {
        id: 'txn_credit',
        account_id: 'acc_1',
        amount: '2400.00',
        date: today,
        description: 'Paycheck',
        status: 'posted' as const,
        type: 'credit',
        running_balance: null,
        details: null,
      },
      {
        id: 'txn_debit',
        account_id: 'acc_1',
        amount: '-50.00',
        date: today,
        description: 'Groceries',
        status: 'posted' as const,
        type: 'debit',
        running_balance: null,
        details: null,
      },
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
