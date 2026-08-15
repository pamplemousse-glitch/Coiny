import { describe, expect, it } from 'vitest';
import {
  actualRunRate,
  type ContributionTransaction,
  computeGoalPace,
  DAYS_PER_MONTH,
  type GoalPaceInput,
  MIN_MONTHS_REMAINING,
  paceBandFor,
} from '../src/goals/pace.js';

const NOW = new Date('2026-08-13T00:00:00Z');

/** Monthly +500 deposits on the 20th, May through July, with history reaching
 *  back past the 90-day window. */
function steadyDeposits(): ContributionTransaction[] {
  return [
    { date: '2026-02-20', amount: 500 },
    { date: '2026-03-20', amount: 500 },
    { date: '2026-05-20', amount: 500 },
    { date: '2026-06-20', amount: 500 },
    { date: '2026-07-20', amount: 500 },
  ];
}

function input(over: Partial<GoalPaceInput> = {}): GoalPaceInput {
  return {
    targetAmountUsd: 10_000,
    targetDate: '2027-08-01',
    createdAt: '2026-05-01',
    countsExistingBalance: true,
    fundingBalanceUsd: 2_000,
    fundingTransactions: steadyDeposits(),
    earliestTransactionDate: '2026-02-20',
    ...over,
  };
}

describe('computeGoalPace null rules (R-7.8)', () => {
  it('null target date yields null requiredRunRate', () => {
    const pace = computeGoalPace(input({ targetDate: null }), NOW);
    expect(pace.requiredRunRateUsd).toBeNull();
  });

  it('null target date yields null pace, not Off pace', () => {
    const pace = computeGoalPace(input({ targetDate: null }), NOW);
    expect(pace.pace).toBeNull();
    expect(pace.paceBand).toBeNull();
  });

  it('null target date still reports the contribution run rate for display', () => {
    const pace = computeGoalPace(input({ targetDate: null }), NOW);
    expect(pace.actualRunRateUsd).not.toBeNull();
  });

  it('a past target date floors months remaining at 0.25 instead of going negative', () => {
    const pace = computeGoalPace(input({ targetDate: '2026-07-01' }), NOW);
    expect(pace.monthsRemaining).toBe(MIN_MONTHS_REMAINING);
  });

  it('a past target date still produces a finite required run rate and a pace', () => {
    const pace = computeGoalPace(input({ targetDate: '2026-07-01' }), NOW);
    expect(pace.requiredRunRateUsd).toBeCloseTo(8_000 / 0.25, 5);
    expect(pace.pace).not.toBeNull();
  });

  it('a target date 3 days out clamps to the same 0.25-month floor', () => {
    const pace = computeGoalPace(input({ targetDate: '2026-08-16' }), NOW);
    expect(pace.monthsRemaining).toBe(MIN_MONTHS_REMAINING);
  });

  it('a 10-day-old funding account yields a null run rate, not zero', () => {
    const pace = computeGoalPace(
      input({
        fundingTransactions: [{ date: '2026-08-05', amount: 100 }],
        earliestTransactionDate: '2026-08-03',
      }),
      NOW,
    );
    expect(pace.actualRunRateUsd).toBeNull();
  });

  it('a 10-day-old funding account yields a null pace band, never Off pace', () => {
    const pace = computeGoalPace(
      input({
        fundingTransactions: [{ date: '2026-08-05', amount: 100 }],
        earliestTransactionDate: '2026-08-03',
      }),
      NOW,
    );
    expect(pace.paceBand).toBeNull();
  });

  it('an unknown funding balance on a balance-counting goal yields null current, not zero', () => {
    const pace = computeGoalPace(input({ fundingBalanceUsd: null }), NOW);
    expect(pace.currentAmountUsd).toBeNull();
    expect(pace.requiredRunRateUsd).toBeNull();
    expect(pace.pace).toBeNull();
  });

  it('an account with zero flows but enough history reports a measured zero, not null', () => {
    const pace = computeGoalPace(input({ fundingTransactions: [], earliestTransactionDate: '2026-04-01' }), NOW);
    expect(pace.actualRunRateUsd).toBe(0);
    expect(pace.paceBand).toBe('off_pace');
  });
});

describe('computeGoalPace bands and current amount', () => {
  it('maps pace ratios onto the R-7.8 bands with the stated boundaries', () => {
    expect(paceBandFor(1.11)).toBe('ahead');
    expect(paceBandFor(1.1)).toBe('on_pace');
    expect(paceBandFor(0.9)).toBe('on_pace');
    expect(paceBandFor(0.89)).toBe('behind');
    expect(paceBandFor(0.5)).toBe('behind');
    expect(paceBandFor(0.49)).toBe('off_pace');
  });

  it('computes pace as actual over required', () => {
    const pace = computeGoalPace(input(), NOW);
    const expectedActual = 1_500 / (90 / DAYS_PER_MONTH);
    expect(pace.actualRunRateUsd).toBeCloseTo(expectedActual, 5);
    expect(pace.pace).toBeCloseTo(expectedActual / (pace.requiredRunRateUsd as number), 5);
  });

  it('uses net contributions since creation when the existing balance does not count', () => {
    const pace = computeGoalPace(input({ countsExistingBalance: false, fundingBalanceUsd: null }), NOW);
    // Deposits on and after the 2026-05-01 creation date: 3 x 500.
    expect(pace.currentAmountUsd).toBe(1_500);
  });

  it('marks the goal achieved when current meets the target', () => {
    const pace = computeGoalPace(input({ fundingBalanceUsd: 12_000 }), NOW);
    expect(pace.achieved).toBe(true);
    expect(pace.paceBand).toBe('ahead');
    expect(pace.gapAction).toBeNull();
  });
});

describe('computeGoalPace gap action', () => {
  it('suggests extra monthly dollars when nothing is flowing to the goal', () => {
    const pace = computeGoalPace(input({ fundingTransactions: [], earliestTransactionDate: '2026-04-01' }), NOW);
    expect(pace.gapAction).toEqual({ type: 'add_monthly', amountUsd: expect.any(Number) });
  });

  it('offers no gap action while the goal is on pace', () => {
    // Required: (10000 - 2000) / monthsRemaining. Pick a date so required is
    // close to the ~507/month actual rate: 8000 / 507.3 = 15.77 months out.
    const pace = computeGoalPace(input({ targetDate: '2027-12-05' }), NOW);
    expect(pace.paceBand).toBe('on_pace');
    expect(pace.gapAction).toBeNull();
  });

  it('offers exactly one change when behind', () => {
    const pace = computeGoalPace(input({ targetDate: '2027-02-01' }), NOW);
    expect(pace.paceBand === 'behind' || pace.paceBand === 'off_pace').toBe(true);
    expect(pace.gapAction).not.toBeNull();
    expect(['add_monthly', 'push_date']).toContain((pace.gapAction as { type: string }).type);
  });
});

describe('actualRunRate', () => {
  it('returns null history when the account has no transactions at all', () => {
    expect(actualRunRate([], null, NOW)).toEqual({ rate: null, historyDays: null });
  });

  it('normalises over the observed span for accounts younger than the window', () => {
    // 45 days of history with +900 net: monthly rate is 900 / (45 / 30.4375).
    const { rate, historyDays } = actualRunRate(
      [
        { date: '2026-06-29', amount: 450 },
        { date: '2026-07-29', amount: 450 },
      ],
      '2026-06-29',
      NOW,
    );
    expect(historyDays).toBe(45);
    expect(rate).toBeCloseTo(900 / (45 / DAYS_PER_MONTH), 5);
  });

  it('ignores transactions older than the 90-day window', () => {
    const { rate } = actualRunRate(
      [
        { date: '2026-01-05', amount: 5_000 },
        { date: '2026-07-20', amount: 500 },
      ],
      '2026-01-05',
      NOW,
    );
    expect(rate).toBeCloseTo(500 / (90 / DAYS_PER_MONTH), 5);
  });
});
