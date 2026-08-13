// Tests for src/reactions/perform.ts: the single choke point between "events
// happened" and "the creature moved". Real SQL via PGlite; the database is
// never mocked.

import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

async function reactionHistoryEvents(): Promise<string[]> {
  const { getState } = await import('../src/store/pet.js');
  const state = await getState(testUserId);
  return state.reactionHistory.map((r) => r.eventType);
}

async function analyticsRows(event: string) {
  const { listAnalyticsEvents } = await import('../src/store/analytics.js');
  return listAnalyticsEvents(testUserId, event);
}

function candidate(name: string, animation = 'happy') {
  return {
    name,
    reaction: {
      animation: animation as import('../src/reactions/types.js').Animation,
      sound: 'chime' as const,
      led: 'green' as const,
      duration: 2000,
      reason: name,
    },
  };
}

describe('performReactions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('performs a single direct candidate and records it to history', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    const result = await performReactions(testUserId, [candidate('paycheck_received')]);

    expect(result.performed?.name).toBe('paycheck_received');
    expect(result.suppressed).toEqual([]);
    expect(await reactionHistoryEvents()).toEqual(['paycheck_received']);
  });

  it('returns null and touches nothing for an empty candidate list', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    const result = await performReactions(testUserId, []);

    expect(result.performed).toBeNull();
    expect(await reactionHistoryEvents()).toEqual([]);
  });

  it('applies the contract health delta for the performed event', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');
    const { getState } = await import('../src/store/pet.js');

    const before = (await getState(testUserId)).healthScore;
    await performReactions(testUserId, [candidate('paycheck_received')]);
    const after = (await getState(testUserId)).healthScore;

    expect(after - before).toBe(10);
  });

  // R-7.25: the creature has one body. Several matches, one performance.
  it('performs only the highest-precedence candidate and suppresses the rest', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    const result = await performReactions(testUserId, [
      candidate('bill_paid_on_time'),
      candidate('paycheck_received'),
      candidate('large_purchase', 'neutral'),
    ]);

    expect(result.performed?.name).toBe('paycheck_received');
    expect(result.suppressed).toEqual([
      { name: 'bill_paid_on_time', reason: 'precedence' },
      { name: 'large_purchase', reason: 'precedence' },
    ]);
    expect(await reactionHistoryEvents()).toEqual(['paycheck_received']);
  });

  // The R-7.25 measurement fix: a dropped match is a recorded fact.
  it('emits reaction_performed and reaction_suppressed analytics for the whole decision', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    await performReactions(testUserId, [candidate('bill_paid_on_time'), candidate('paycheck_received')]);

    const performed = await analyticsRows('reaction_performed');
    expect(performed).toHaveLength(1);
    expect(performed[0]?.properties).toEqual({
      type: 'paycheck_received',
      origin: 'behavior',
      suppressed_count: 1,
    });

    const suppressed = await analyticsRows('reaction_suppressed');
    expect(suppressed).toHaveLength(1);
    expect(suppressed[0]?.properties).toEqual({ type: 'bill_paid_on_time', reason: 'precedence' });
  });

  // Principle 1, enforced at the last gate: a non-direct event can never move
  // the creature even if a producer hands one over by mistake.
  it('suppresses a non-direct candidate as non_direct and performs nothing', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    const result = await performReactions(testUserId, [candidate('net_worth_milestone', 'celebrate')]);

    expect(result.performed).toBeNull();
    expect(result.suppressed).toEqual([{ name: 'net_worth_milestone', reason: 'non_direct' }]);
    expect(await reactionHistoryEvents()).toEqual([]);
  });

  it('never emits a market-origin reaction_performed (R-2.3)', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    await performReactions(testUserId, [candidate('net_worth_milestone', 'celebrate'), candidate('paycheck_received')]);

    const performed = await analyticsRows('reaction_performed');
    expect(performed).toHaveLength(1);
    expect(performed[0]?.properties).toMatchObject({ type: 'paycheck_received', origin: 'behavior' });
  });

  // R-7.24: overspend_vs_plan performs at most once per rolling week.
  it('suppresses a second overspend within the week as weekly_cap', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    const first = await performReactions(testUserId, [candidate('overspend_vs_plan', 'concerned')]);
    expect(first.performed?.name).toBe('overspend_vs_plan');

    const second = await performReactions(testUserId, [candidate('overspend_vs_plan', 'concerned')]);
    expect(second.performed).toBeNull();
    expect(second.suppressed).toEqual([{ name: 'overspend_vs_plan', reason: 'weekly_cap' }]);
    expect(await reactionHistoryEvents()).toEqual(['overspend_vs_plan']);
  });

  it('promotes the next candidate when the overspend is weekly-capped', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');

    await performReactions(testUserId, [candidate('overspend_vs_plan', 'concerned')]);
    const result = await performReactions(testUserId, [
      candidate('overspend_vs_plan', 'concerned'),
      candidate('goal_period_missed', 'neutral'),
    ]);

    // overspend outranks goal_period_missed, but the cap passes the turn on.
    expect(result.performed?.name).toBe('goal_period_missed');
    expect(result.suppressed).toEqual([{ name: 'overspend_vs_plan', reason: 'weekly_cap' }]);
  });

  // R-7.25: the per-day budget stops routine reactions from flooding the feed.
  it('suppresses a routine candidate as daily_budget once the day budget is spent', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');
    const { DAILY_REACTION_BUDGET } = await import('../src/reactions/contract.js');

    for (let i = 0; i < DAILY_REACTION_BUDGET; i++) {
      const result = await performReactions(testUserId, [candidate('bill_paid_on_time')]);
      expect(result.performed?.name).toBe('bill_paid_on_time');
    }

    const over = await performReactions(testUserId, [candidate('bill_paid_on_time')]);
    expect(over.performed).toBeNull();
    expect(over.suppressed).toEqual([{ name: 'bill_paid_on_time', reason: 'daily_budget' }]);
  });

  it('still performs a budget-exempt celebration after the day budget is spent', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');
    const { DAILY_REACTION_BUDGET } = await import('../src/reactions/contract.js');
    const { reactionForEvent } = await import('../src/reactions/contract.js');

    for (let i = 0; i < DAILY_REACTION_BUDGET; i++) {
      await performReactions(testUserId, [candidate('bill_paid_on_time')]);
    }

    const result = await performReactions(testUserId, [
      { name: 'ladder_rung_completed', reaction: reactionForEvent('ladder_rung_completed') },
    ]);
    expect(result.performed?.name).toBe('ladder_rung_completed');
  });

  // Several rungs completing in one refresh is one transformation, not six.
  it('performs one reaction for several completed rungs and suppresses the rest', async () => {
    const { performReactions } = await import('../src/reactions/perform.js');
    const { reactionForEvent } = await import('../src/reactions/contract.js');

    const candidates = [5, 4, 3].map((idx) => ({
      name: 'ladder_rung_completed',
      reaction: reactionForEvent('ladder_rung_completed', `ladder_rung_completed (rung ${idx})`),
    }));
    const result = await performReactions(testUserId, candidates);

    expect(result.performed?.reaction.reason).toBe('ladder_rung_completed (rung 5)');
    expect(result.suppressed).toEqual([
      { name: 'ladder_rung_completed', reason: 'precedence' },
      { name: 'ladder_rung_completed', reason: 'precedence' },
    ]);
    expect(await reactionHistoryEvents()).toEqual(['ladder_rung_completed']);
  });
});
