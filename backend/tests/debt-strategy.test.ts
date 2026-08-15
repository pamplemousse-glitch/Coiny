// Tests for src/debts/strategy.ts. The amortisation expectations below were
// hand-computed independently of the implementation (accrue-then-pay monthly
// chain, written out step by step), so a shared misunderstanding in the sim
// cannot silently confirm itself.

import { describe, expect, it } from 'vitest';
import {
  ASSUMED_CREDIT_CARD_APR,
  addMonths,
  clearingPayment,
  comparePlans,
  type PlanDebtInput,
  simulatePlan,
} from '../src/debts/strategy.js';

const START = new Date(Date.UTC(2026, 0, 15)); // 2026-01-15

function debt(over: Partial<PlanDebtInput> & { id: string; balance: number }): PlanDebtInput {
  return {
    type: 'credit_card',
    apr: null,
    minPayment: null,
    isPromotional: false,
    promoApr: null,
    promoEndDate: null,
    ...over,
  };
}

describe('addMonths', () => {
  it('adds calendar months preserving the day', () => {
    expect(
      addMonths(new Date(Date.UTC(2026, 0, 15)), 2)
        .toISOString()
        .slice(0, 10),
    ).toBe('2026-03-15');
  });

  it('clamps to the last day of shorter months', () => {
    expect(
      addMonths(new Date(Date.UTC(2026, 0, 31)), 1)
        .toISOString()
        .slice(0, 10),
    ).toBe('2026-02-28');
  });
});

describe('clearingPayment', () => {
  it('matches the hand-computed annuity payment for 10000 at 24% over 36 months', () => {
    // r = 0.02; P = 200 / (1 - 1.02^-36) = 200 / 0.5097765 = 392.33
    expect(clearingPayment(10000, 24, 36)).toBeCloseTo(392.33, 1);
  });

  it('divides evenly at zero percent', () => {
    expect(clearingPayment(3600, 0, 36)).toBe(100);
  });
});

describe('simulatePlan: single debt', () => {
  // Hand chain for 1000 at 12% APR (1%/month), 100/month, accrue then pay:
  // after m10 the balance is 58.4009; m11 accrues to 58.9849 and clears.
  // Total interest = 10 * 100 + 58.9849 - 1000 = 58.98.
  const single = [debt({ id: 'only', balance: 1000, apr: 12, minPayment: 100 })];

  it('clears 1000 at 12% with 100 per month in 11 months', () => {
    const plan = simulatePlan(single, 0, 'avalanche', START);
    expect(plan.months).toBe(11);
  });

  it('accrues 58.98 of interest on the hand-computed chain', () => {
    const plan = simulatePlan(single, 0, 'avalanche', START);
    expect(plan.totalInterest).toBeCloseTo(58.98, 1);
  });

  it('reports the debt-free date 11 calendar months out', () => {
    const plan = simulatePlan(single, 0, 'avalanche', START);
    expect(plan.debtFreeDate).toBe('2026-12-15');
  });

  it('produces identical results under all three strategies', () => {
    const results = (['blend', 'avalanche', 'snowball'] as const).map((s) => simulatePlan(single, 0, s, START));
    const months = results.map((r) => r.months);
    const interest = results.map((r) => r.totalInterest);
    expect(new Set(months).size).toBe(1);
    expect(new Set(interest).size).toBe(1);
  });
});

describe('simulatePlan: promotional APR expiring mid-payoff', () => {
  // 1000 at 0% promo for 3 months, then 12%: months 1-3 pay pure principal
  // (balance 700), then the 1%/month chain runs: hand-computed payoff in
  // month 11 with total interest 29.43.
  const promo = [
    debt({
      id: 'promo',
      balance: 1000,
      apr: 12,
      minPayment: 100,
      isPromotional: true,
      promoApr: 0,
      promoEndDate: '2026-04-15',
    }),
  ];

  it('clears in 11 months', () => {
    const plan = simulatePlan(promo, 0, 'blend', START);
    expect(plan.months).toBe(11);
  });

  it('accrues 29.43 of interest, all of it after the promo expires', () => {
    const plan = simulatePlan(promo, 0, 'blend', START);
    expect(plan.totalInterest).toBeCloseTo(29.43, 1);
  });

  it('costs less than the same debt with no promo window', () => {
    const noPromo = [debt({ id: 'promo', balance: 1000, apr: 12, minPayment: 100 })];
    const withPromo = simulatePlan(promo, 0, 'blend', START);
    const without = simulatePlan(noPromo, 0, 'blend', START);
    expect(withPromo.totalInterest).toBeLessThan(without.totalInterest);
  });
});

describe('simulatePlan: minimum below the interest', () => {
  // 10000 at 24% accrues 200/month; an 85/month payment never touches
  // principal. This is a finding to surface, not an error to swallow.
  const trap = [debt({ id: 'trap', balance: 10000, apr: 24, minPayment: 85 })];

  it('reports a never_pays_off finding instead of a payoff date', () => {
    const plan = simulatePlan(trap, 0, 'avalanche', START);
    expect(plan.findings.map((f) => f.kind)).toEqual(['never_pays_off']);
  });

  it('leaves months and debtFreeDate null', () => {
    const plan = simulatePlan(trap, 0, 'avalanche', START);
    expect([plan.months, plan.debtFreeDate]).toEqual([null, null]);
  });

  it('states the monthly interest at the current balance', () => {
    const plan = simulatePlan(trap, 0, 'avalanche', START);
    expect(plan.findings[0]?.monthlyInterest).toBeCloseTo(200, 2);
  });

  it('offers the 36-month clearing payment as the way out', () => {
    const plan = simulatePlan(trap, 0, 'avalanche', START);
    expect(plan.findings[0]?.clearingPayment36).toBeCloseTo(392.33, 1);
  });

  it('clears once extra payment pushes the total above the interest', () => {
    const plan = simulatePlan(trap, 300, 'avalanche', START);
    expect(plan.findings).toEqual([]);
  });
});

describe('blend versus pure avalanche', () => {
  // A: 400 at 12%, min 25. B: 5000 at 22%, min 100. Extra 150.
  // Concentrating the full extra on A (25 + 150 = 175/month) clears it in
  // 3 months (404 -> 229 -> 56.29 -> cleared), so Blend promotes A first
  // despite its lower APR. Avalanche starts with B.
  const debts = [
    debt({ id: 'a', balance: 400, apr: 12, minPayment: 25 }),
    debt({ id: 'b', balance: 5000, apr: 22, minPayment: 100 }),
  ];

  it('blend promotes the 3-month quick win to first despite lower APR', () => {
    const plan = simulatePlan(debts, 150, 'blend', START);
    expect(plan.targetOrder).toEqual(['a', 'b']);
  });

  it('avalanche targets the high-APR debt first', () => {
    const plan = simulatePlan(debts, 150, 'avalanche', START);
    expect(plan.targetOrder).toEqual(['b', 'a']);
  });

  it('quantifies the cost of the blend choice in dollars', () => {
    const comparison = comparePlans(debts, 150, START);
    expect(comparison.blend.totalInterest).toBeGreaterThan(comparison.avalanche.totalInterest);
  });

  it('does not promote a debt the full extra cannot clear in 3 months', () => {
    const slow = [
      debt({ id: 'big-low', balance: 3000, apr: 12, minPayment: 60 }),
      debt({ id: 'high', balance: 5000, apr: 22, minPayment: 100 }),
    ];
    const plan = simulatePlan(slow, 150, 'blend', START);
    expect(plan.targetOrder).toEqual(['high', 'big-low']);
  });
});

describe('snowball', () => {
  it('orders by smallest balance regardless of APR', () => {
    const debts = [
      debt({ id: 'small-cheap', balance: 300, apr: 6, minPayment: 25 }),
      debt({ id: 'large-dear', balance: 4000, apr: 25, minPayment: 100 }),
    ];
    const plan = simulatePlan(debts, 100, 'snowball', START);
    expect(plan.targetOrder).toEqual(['small-cheap', 'large-dear']);
  });
});

describe('unknown APR handling', () => {
  it('sorts an unknown-rate card as high APR, never as zero', () => {
    const debts = [
      debt({ id: 'known', balance: 1000, apr: 18, minPayment: 30 }),
      debt({ id: 'unknown', balance: 1000, apr: null, minPayment: 30 }),
    ];
    const plan = simulatePlan(debts, 100, 'avalanche', START);
    // Assumed 24.99% beats the known 18%; treating null as 0 would sort it last.
    expect(plan.targetOrder).toEqual(['unknown', 'known']);
  });

  it('flags the assumed rate on the per-debt result', () => {
    const plan = simulatePlan([debt({ id: 'u', balance: 500, apr: null, minPayment: 50 })], 0, 'blend', START);
    expect(plan.perDebt[0]?.aprAssumed).toBe(true);
  });

  it('assumes the documented credit card rate', () => {
    expect(ASSUMED_CREDIT_CARD_APR).toBe(24.99);
  });
});

describe('rollover of freed minimums', () => {
  it('keeps total monthly outlay constant after a payoff', () => {
    // A cleared debt's minimum joins the extra pool: the plan with two debts
    // must finish no later than paying each in isolation sequentially.
    const debts = [
      debt({ id: 'first', balance: 500, apr: 12, minPayment: 50 }),
      debt({ id: 'second', balance: 2000, apr: 12, minPayment: 50 }),
    ];
    const together = simulatePlan(debts, 0, 'snowball', START);
    const secondAlone = simulatePlan(
      [debt({ id: 'second', balance: 2000, apr: 12, minPayment: 50 })],
      0,
      'snowball',
      START,
    );
    expect(together.months as number).toBeLessThan(secondAlone.months as number);
  });
});

describe('empty plan', () => {
  it('reports zero months and no interest for no debts', () => {
    const plan = simulatePlan([], 100, 'blend', START);
    expect([plan.months, plan.totalInterest, plan.findings.length]).toEqual([0, 0, 0]);
  });
});
