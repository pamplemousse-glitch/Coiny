import { describe, expect, it } from 'vitest';
import {
  closedPeriods,
  evaluateGuardrail,
  GUARDRAILS,
  type GuardrailContext,
  type GuardrailTransaction,
  monthOf,
  type Period,
  replayStreak,
  type StoredPeriodOutcome,
  weekOf,
} from '../src/goals/guardrails.js';

const NOW = new Date('2026-08-13T00:00:00Z'); // a Thursday

function tx(over: Partial<GuardrailTransaction> = {}): GuardrailTransaction {
  return {
    date: '2026-07-01',
    amount: -10,
    category: null,
    merchantName: null,
    accountId: 'acct-1',
    ...over,
  };
}

function ctx(over: Partial<GuardrailContext> = {}): GuardrailContext {
  return {
    transactions: [],
    earliestTransactionDate: null,
    liabilities: [],
    goalFundingAccountIds: [],
    surplusTargetRate: 0.2,
    achievedSavingsQuarters: 0,
    ...over,
  };
}

const JULY: Period = { start: '2026-07-01', end: '2026-07-31' };

describe('period arithmetic', () => {
  it('weekOf returns the Monday-start week containing the date', () => {
    expect(weekOf(NOW)).toEqual({ start: '2026-08-10', end: '2026-08-16' });
  });

  it('monthOf returns the calendar month containing the date', () => {
    expect(monthOf(NOW)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('closedPeriods returns fully closed weeks, oldest first', () => {
    expect(closedPeriods('week', NOW, 2)).toEqual([
      { start: '2026-07-27', end: '2026-08-02' },
      { start: '2026-08-03', end: '2026-08-09' },
    ]);
  });

  it('closedPeriods returns fully closed months, oldest first', () => {
    expect(closedPeriods('month', NOW, 2)).toEqual([
      { start: '2026-06-01', end: '2026-06-30' },
      { start: '2026-07-01', end: '2026-07-31' },
    ]);
  });
});

describe('savings_rate_floor', () => {
  const income = tx({ date: '2026-07-01', amount: 5_000, category: 'paycheck' });

  it('passes a month at or above the floor', () => {
    const c = ctx({ transactions: [income, tx({ date: '2026-07-10', amount: -4_000, category: 'rent' })] });
    const result = evaluateGuardrail('savings_rate_floor', JULY, c);
    expect(result.outcome).toBe('passed');
  });

  it('misses a month below the floor', () => {
    const c = ctx({ transactions: [income, tx({ date: '2026-07-10', amount: -4_500, category: 'rent' })] });
    const result = evaluateGuardrail('savings_rate_floor', JULY, c);
    expect(result.outcome).toBe('missed');
  });

  it('is indeterminate when the month has no recorded income', () => {
    const c = ctx({ transactions: [tx({ date: '2026-07-10', amount: -500, category: 'rent' })] });
    const result = evaluateGuardrail('savings_rate_floor', JULY, c);
    expect(result.outcome).toBe('indeterminate');
  });

  it('consumes the Layer 0 fraction, so a fractional floor can actually fail', () => {
    // The display savings rate is an integer 0 to 100; if that were consumed
    // here, a 10% month would read as 10 >= 0.15 and pass forever.
    const c = ctx({ transactions: [income, tx({ date: '2026-07-10', amount: -4_500, category: 'rent' })] });
    const result = evaluateGuardrail('savings_rate_floor', JULY, c);
    expect(result.actualValue).toBeCloseTo(0.1, 5);
    expect(result.outcome).toBe('missed');
  });

  it('raises the floor 2pp per achieved quarter, capped at the rung target', () => {
    const c = ctx({ achievedSavingsQuarters: 10, transactions: [income] });
    const result = evaluateGuardrail('savings_rate_floor', JULY, c);
    expect(result.targetValue).toBe(0.2);
  });
});

describe('discretionary_cap', () => {
  const WEEK: Period = { start: '2026-08-03', end: '2026-08-09' };

  /** One -$50 restaurants charge in each of the 8 weeks before WEEK. */
  function lookbackSpending(): GuardrailTransaction[] {
    const txs: GuardrailTransaction[] = [];
    for (let w = 1; w <= 8; w++) {
      const d = new Date('2026-08-03T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 7 * w);
      txs.push(tx({ date: d.toISOString().slice(0, 10), amount: -50, category: 'restaurants' }));
    }
    return txs;
  }

  it('is indeterminate without a full 8 weeks of history', () => {
    const c = ctx({ transactions: lookbackSpending().slice(0, 3), earliestTransactionDate: '2026-07-20' });
    expect(evaluateGuardrail('discretionary_cap', WEEK, c).outcome).toBe('indeterminate');
  });

  it('is not applicable when no discretionary spending exists to cap', () => {
    const c = ctx({
      transactions: [tx({ date: '2026-07-01', amount: -900, category: 'rent' })],
      earliestTransactionDate: '2026-01-01',
    });
    expect(evaluateGuardrail('discretionary_cap', WEEK, c).outcome).toBe('not_applicable');
  });

  it('misses when the week exceeds the trailing median minus 10%', () => {
    const c = ctx({
      transactions: [...lookbackSpending(), tx({ date: '2026-08-05', amount: -100, category: 'restaurants' })],
      earliestTransactionDate: '2026-01-01',
    });
    const result = evaluateGuardrail('discretionary_cap', WEEK, c);
    expect(result.targetValue).toBeCloseTo(45, 5);
    expect(result.outcome).toBe('missed');
  });

  it('passes when the week stays under the cap', () => {
    const c = ctx({
      transactions: [...lookbackSpending(), tx({ date: '2026-08-05', amount: -30, category: 'restaurants' })],
      earliestTransactionDate: '2026-01-01',
    });
    expect(evaluateGuardrail('discretionary_cap', WEEK, c).outcome).toBe('passed');
  });
});

describe('bills_on_time', () => {
  it('is indeterminate with no liability data at all', () => {
    expect(evaluateGuardrail('bills_on_time', JULY, ctx()).outcome).toBe('indeterminate');
  });

  it('misses when any account is overdue', () => {
    const c = ctx({ liabilities: [{ nextDueDate: '2026-08-20', isOverdue: true }] });
    expect(evaluateGuardrail('bills_on_time', JULY, c).outcome).toBe('missed');
  });

  it('passes when every due-dated account is affirmatively not overdue', () => {
    const c = ctx({
      liabilities: [
        { nextDueDate: '2026-08-20', isOverdue: false },
        { nextDueDate: '2026-08-25', isOverdue: false },
      ],
    });
    expect(evaluateGuardrail('bills_on_time', JULY, c).outcome).toBe('passed');
  });

  it('is indeterminate rather than failed when an account cannot be verified', () => {
    const c = ctx({
      liabilities: [
        { nextDueDate: '2026-08-20', isOverdue: false },
        { nextDueDate: '2026-08-25', isOverdue: null },
      ],
    });
    expect(evaluateGuardrail('bills_on_time', JULY, c).outcome).toBe('indeterminate');
  });
});

describe('contribution_streak', () => {
  const WEEK: Period = { start: '2026-08-03', end: '2026-08-09' };

  it('is not applicable when no goal has a funding account', () => {
    expect(evaluateGuardrail('contribution_streak', WEEK, ctx()).outcome).toBe('not_applicable');
  });

  it('is indeterminate when transaction history does not cover the week', () => {
    const c = ctx({ goalFundingAccountIds: ['acct-goal'], earliestTransactionDate: null });
    expect(evaluateGuardrail('contribution_streak', WEEK, c).outcome).toBe('indeterminate');
  });

  it('passes on a net positive transfer to a goal account', () => {
    const c = ctx({
      goalFundingAccountIds: ['acct-goal'],
      earliestTransactionDate: '2026-01-01',
      transactions: [tx({ date: '2026-08-04', amount: 200, accountId: 'acct-goal' })],
    });
    expect(evaluateGuardrail('contribution_streak', WEEK, c).outcome).toBe('passed');
  });

  it('misses a week with no net inflow to any goal account', () => {
    const c = ctx({
      goalFundingAccountIds: ['acct-goal'],
      earliestTransactionDate: '2026-01-01',
      transactions: [tx({ date: '2026-08-04', amount: -60, accountId: 'acct-goal' })],
    });
    expect(evaluateGuardrail('contribution_streak', WEEK, c).outcome).toBe('missed');
  });
});

describe('no_new_recurring', () => {
  function monthlyCharges(merchant: string, amount: number, months: string[]): GuardrailTransaction[] {
    return months.map((m) => tx({ date: `${m}-10`, amount, merchantName: merchant }));
  }

  it('is indeterminate below 90 days of history before the month', () => {
    const c = ctx({ earliestTransactionDate: '2026-06-01', transactions: [] });
    expect(evaluateGuardrail('no_new_recurring', JULY, c).outcome).toBe('indeterminate');
  });

  it('passes when only long-standing subscriptions are present', () => {
    const c = ctx({
      earliestTransactionDate: '2026-02-01',
      transactions: monthlyCharges('Netflix', -15.99, [
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
      ]),
    });
    expect(evaluateGuardrail('no_new_recurring', JULY, c).outcome).toBe('passed');
  });

  it('misses when a merchant first becomes detectable inside the month', () => {
    const c = ctx({
      earliestTransactionDate: '2026-02-01',
      transactions: [
        ...monthlyCharges('Netflix', -15.99, ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']),
        ...monthlyCharges('GymCo', -40, ['2026-05', '2026-06', '2026-07']),
      ],
    });
    const result = evaluateGuardrail('no_new_recurring', JULY, c);
    expect(result.outcome).toBe('missed');
    expect(result.actualValue).toBe(1);
  });
});

describe('guardrails without a data source', () => {
  it('utilization_before_close always evaluates indeterminate, never missed', () => {
    expect(evaluateGuardrail('utilization_before_close', JULY, ctx()).outcome).toBe('indeterminate');
  });

  it('debt_principal_paid always evaluates indeterminate, never missed', () => {
    expect(evaluateGuardrail('debt_principal_paid', JULY, ctx()).outcome).toBe('indeterminate');
  });

  it('declares an unavailable reason for exactly the sourceless guardrails', () => {
    const unavailable = GUARDRAILS.filter((g) => g.unavailableReason !== null).map((g) => g.key);
    expect(unavailable).toEqual(['utilization_before_close', 'debt_principal_paid']);
  });
});

describe('replayStreak (R-7.12)', () => {
  const passed: StoredPeriodOutcome = { outcome: 'passed', repairUsed: false };
  const missed: StoredPeriodOutcome = { outcome: 'missed', repairUsed: false };
  const repaired: StoredPeriodOutcome = { outcome: 'missed', repairUsed: true };
  const unknown: StoredPeriodOutcome = { outcome: 'indeterminate', repairUsed: false };

  it('starts with two repair tokens banked', () => {
    expect(replayStreak([]).repairTokens).toBe(2);
  });

  it('counts consecutive completed periods', () => {
    expect(replayStreak([passed, passed, passed]).streak).toBe(3);
  });

  it('caps the token bank at two even after earning', () => {
    expect(replayStreak([passed, passed, passed]).repairTokens).toBe(2);
  });

  it('a repaired miss spends a token and preserves the streak', () => {
    const state = replayStreak([passed, repaired, passed]);
    expect(state.streak).toBe(2);
    expect(state.repairTokens).toBe(1);
  });

  it('an unrepaired miss resets the streak counter and nothing else', () => {
    const state = replayStreak([passed, passed, missed]);
    expect(state.streak).toBe(0);
    expect(state.repairTokens).toBe(2);
    expect(state.totalPassed).toBe(2);
  });

  it('earns a token back after three completed periods', () => {
    const state = replayStreak([repaired, passed, passed, passed]);
    expect(state.repairTokens).toBe(2);
  });

  it('indeterminate periods neither break nor extend the streak', () => {
    const state = replayStreak([passed, unknown, passed]);
    expect(state.streak).toBe(2);
  });
});
