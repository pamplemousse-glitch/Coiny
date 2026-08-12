import { describe, expect, it } from 'vitest';
import { computeDerivedState, type DerivedInputTransaction } from '../src/goals/derived.js';

const NOW = new Date('2026-08-12T00:00:00Z');

function tx(date: string, amount: string, category: string | null): DerivedInputTransaction {
  return { date, amount, category };
}

/** n months of steady salary plus steady essential + discretionary spend. */
function steadyHistory(months: number, salary = 5000): DerivedInputTransaction[] {
  const out: DerivedInputTransaction[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(NOW);
    d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().slice(0, 7);
    out.push(tx(`${ym}-01`, String(salary), 'paycheck'));
    out.push(tx(`${ym}-05`, '-1500', 'rent'));
    out.push(tx(`${ym}-10`, '-500', 'groceries'));
    out.push(tx(`${ym}-15`, '-600', 'restaurants'));
  }
  return out;
}

describe('computeDerivedState', () => {
  it('returns all nulls with no transactions', () => {
    const d = computeDerivedState([], null, NOW);
    expect(d.takeHomeMonthly).toBeNull();
    expect(d.incomeVolatility).toBeNull();
    expect(d.essentialMonthly).toBeNull();
    expect(d.savingsRate).toBeNull();
    expect(d.runwayMonths).toBeNull();
  });

  it('uses a median for take-home so one bonus does not move the baseline', () => {
    const txs = steadyHistory(6, 5000);
    // A single $40,000 windfall in the most recent month.
    txs.push(tx(`${NOW.toISOString().slice(0, 7)}-20`, '40000', 'income'));
    const d = computeDerivedState(txs, null, NOW);
    // A mean would be dragged far above 5000; the median holds.
    expect(d.takeHomeMonthly).toBe(5000);
  });

  it('splits essential from discretionary spend', () => {
    const d = computeDerivedState(steadyHistory(3), null, NOW);
    // rent 1500 + groceries 500 essential, restaurants 600 discretionary, monthly.
    expect(Math.round(d.essentialMonthly ?? 0)).toBe(2000);
    expect(Math.round(d.discretionaryMonthly ?? 0)).toBe(600);
  });

  it('excludes transfers from spend', () => {
    const withTransfer = [...steadyHistory(3), tx(`${NOW.toISOString().slice(0, 7)}-11`, '-9000', 'transfer')];
    const a = computeDerivedState(steadyHistory(3), null, NOW);
    const b = computeDerivedState(withTransfer, null, NOW);
    expect(b.discretionaryMonthly).toBe(a.discretionaryMonthly);
  });

  it('does not count a refund as income', () => {
    const withRefund = [...steadyHistory(6), tx(`${NOW.toISOString().slice(0, 7)}-21`, '3000', 'shopping')];
    const d = computeDerivedState(withRefund, null, NOW);
    expect(d.takeHomeMonthly).toBe(5000);
  });

  it('computes savings rate as a fraction, not a percentage', () => {
    // 5000 in, 2600 out, so 48% saved.
    const d = computeDerivedState(steadyHistory(6), null, NOW);
    expect(d.savingsRate).toBeGreaterThan(0.4);
    expect(d.savingsRate).toBeLessThan(0.6);
  });

  it('clamps savings rate to 0 rather than going negative', () => {
    const txs = steadyHistory(6, 1000); // spends far more than it earns
    const d = computeDerivedState(txs, null, NOW);
    expect(d.savingsRate).toBe(0);
  });

  it('computes runway from essentials, not total burn', () => {
    const d = computeDerivedState(steadyHistory(3), 10_000, NOW);
    // 10,000 / 2,000 essential = 5 months. Using total burn would give 3.8.
    expect(Math.round(d.runwayMonths ?? 0)).toBe(5);
  });
});

describe('income volatility', () => {
  it('is null with too little history to mean anything', () => {
    const d = computeDerivedState(steadyHistory(2), null, NOW);
    expect(d.incomeVolatility).toBeNull();
  });

  it('is near zero for steady salaried income', () => {
    const d = computeDerivedState(steadyHistory(12), null, NOW);
    expect(d.incomeVolatility).toBeLessThan(0.05);
  });

  it('is high for irregular freelance income', () => {
    const amounts = [9000, 0, 2000, 12000, 500, 7000, 0, 15000, 1000, 3000, 8000, 200];
    const txs: DerivedInputTransaction[] = amounts.map((amt, i) => {
      const d = new Date(NOW);
      d.setMonth(d.getMonth() - i);
      return tx(`${d.toISOString().slice(0, 7)}-01`, String(amt), 'income');
    });
    const d = computeDerivedState(txs, null, NOW);
    expect(d.incomeVolatility).toBeGreaterThan(0.35);
  });

  it('counts an interior zero-income month as variability', () => {
    const steady = [5000, 5000, 5000, 5000, 5000, 5000];
    const gapped = [5000, 5000, 0, 5000, 5000, 5000];
    const build = (amounts: number[]) =>
      amounts.map((amt, i) => {
        const d = new Date(NOW);
        d.setMonth(d.getMonth() - i);
        return tx(`${d.toISOString().slice(0, 7)}-01`, String(amt), 'paycheck');
      });
    const a = computeDerivedState(build(steady), null, NOW);
    const b = computeDerivedState(build(gapped), null, NOW);
    expect(b.incomeVolatility ?? 0).toBeGreaterThan(a.incomeVolatility ?? 0);
  });
});

// null means "unknown" everywhere, and unknown must never read as zero.
describe('unknown is not zero', () => {
  it('leaves runway null when cash is unknown', () => {
    const d = computeDerivedState(steadyHistory(3), null, NOW);
    expect(d.runwayMonths).toBeNull();
  });

  it('leaves savings rate null when there is no income', () => {
    const spendOnly = [tx('2026-08-01', '-500', 'groceries')];
    const d = computeDerivedState(spendOnly, 1000, NOW);
    expect(d.savingsRate).toBeNull();
  });

  it('ignores malformed amounts rather than treating them as zero', () => {
    const withJunk = [...steadyHistory(6), tx(`${NOW.toISOString().slice(0, 7)}-22`, 'not-a-number', 'paycheck')];
    const d = computeDerivedState(withJunk, null, NOW);
    expect(d.takeHomeMonthly).toBe(5000);
  });
});
