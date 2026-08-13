import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-12T00:00:00Z');

describe('net worth time series', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('stores one point per day and overwrites on re-run', async () => {
    const { recordNetWorthDaily, getNetWorthSeries, netWorthPointCount } = await import('../src/store/goals.js');

    await recordNetWorthDaily(testUserId, '2026-08-12', 50_000, { bank: 50_000 });
    await recordNetWorthDaily(testUserId, '2026-08-12', 51_000, { bank: 51_000 });

    expect(await netWorthPointCount(testUserId)).toBe(1);
    const series = await getNetWorthSeries(testUserId, 30);
    expect(series[0]?.totalUsd).toBe(51_000);
  });

  it('returns points in date order', async () => {
    const { recordNetWorthDaily, getNetWorthSeries } = await import('../src/store/goals.js');
    await recordNetWorthDaily(testUserId, '2026-08-11', 2, {});
    await recordNetWorthDaily(testUserId, '2026-08-09', 1, {});
    await recordNetWorthDaily(testUserId, '2026-08-12', 3, {});

    const series = await getNetWorthSeries(testUserId, 30);
    expect(series.map((p) => p.totalUsd)).toEqual([1, 2, 3]);
  });

  it('distinguishes no history from flat history', async () => {
    const { netWorthPointCount, latestNetWorth } = await import('../src/store/goals.js');
    expect(await netWorthPointCount(testUserId)).toBe(0);
    expect(await latestNetWorth(testUserId)).toBeNull();
  });
});

describe('derived state persistence', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('round-trips through the database', async () => {
    const { saveDerivedState, getDerivedState } = await import('../src/store/goals.js');
    await saveDerivedState(
      testUserId,
      {
        takeHomeMonthly: 5000,
        incomeVolatility: 0.12,
        essentialMonthly: 2000,
        discretionaryMonthly: 600,
        liquidCash: 10_000,
        runwayMonths: 5,
        savingsRate: 0.48,
      },
      NOW,
    );

    const read = await getDerivedState(testUserId);
    expect(read?.takeHomeMonthly).toBe(5000);
    expect(read?.incomeVolatility).toBeCloseTo(0.12, 5);
    expect(read?.savingsRate).toBeCloseTo(0.48, 5);
  });

  it('preserves null as null rather than coercing to zero', async () => {
    const { saveDerivedState, getDerivedState } = await import('../src/store/goals.js');
    await saveDerivedState(
      testUserId,
      {
        takeHomeMonthly: null,
        incomeVolatility: null,
        essentialMonthly: null,
        discretionaryMonthly: null,
        liquidCash: null,
        runwayMonths: null,
        savingsRate: null,
      },
      NOW,
    );
    const read = await getDerivedState(testUserId);
    expect(read?.takeHomeMonthly).toBeNull();
    expect(read?.savingsRate).toBeNull();
  });
});

describe('ladder persistence and stage', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  const ctx = (over = {}) => ({
    hasConnectedAccount: true,
    essentialMonthly: 3000,
    incomeVolatility: 0.1,
    takeHomeMonthly: 6000,
    liquidCash: 50_000,
    savingsRate: 0.1,
    monthsAtSurplusRate: 0,
    highAprDebtBalances: [] as number[],
    investedTotal: 0,
    taxAdvantagedRate: 0,
    employerMatch: 'captured' as const,
    shelteredTargetRate: null,
    surplusTargetRate: null,
    ...over,
  });

  it('persists the ladder and creates a pet stage', async () => {
    const { refreshLadder, getLadderState, getPetStage } = await import('../src/store/goals.js');
    await refreshLadder(testUserId, ctx(), NOW);

    const state = await getLadderState(testUserId);
    expect(state?.rungs['0']?.status).toBe('completed');
    expect(await getPetStage(testUserId)).toBeGreaterThan(0);
  });

  // The stage is a monotonic high-water mark, so no future change to rung
  // evaluation can take away a stage a user already reached.
  it('never lowers the pet stage', async () => {
    const { refreshLadder, getPetStage } = await import('../src/store/goals.js');

    await refreshLadder(testUserId, ctx({ liquidCash: 50_000, highAprDebtBalances: [] }), NOW);
    const high = await getPetStage(testUserId);

    await refreshLadder(testUserId, ctx({ liquidCash: 0, highAprDebtBalances: [8200] }), NOW);
    expect(await getPetStage(testUserId)).toBe(high);
  });
});

describe('countConsecutiveMonthsAtRate', () => {
  it('counts a sustained streak, ignoring the incomplete current month', async () => {
    const { countConsecutiveMonthsAtRate } = await import('../src/store/goals.js');
    const txs = [];
    for (let back = 1; back <= 4; back++) {
      const d = new Date(NOW);
      d.setMonth(d.getMonth() - back);
      const ym = d.toISOString().slice(0, 7);
      txs.push({ date: `${ym}-01`, amount: '5000', category: 'paycheck' });
      txs.push({ date: `${ym}-10`, amount: '-1000', category: 'rent' });
    }
    expect(countConsecutiveMonthsAtRate(txs, 0.25, NOW)).toBe(4);
  });

  it('breaks the streak at the first month below target', async () => {
    const { countConsecutiveMonthsAtRate } = await import('../src/store/goals.js');
    const txs = [];
    for (let back = 1; back <= 4; back++) {
      const d = new Date(NOW);
      d.setMonth(d.getMonth() - back);
      const ym = d.toISOString().slice(0, 7);
      txs.push({ date: `${ym}-01`, amount: '5000', category: 'paycheck' });
      // The second month back blows the budget.
      txs.push({ date: `${ym}-10`, amount: back === 2 ? '-4900' : '-1000', category: 'rent' });
    }
    expect(countConsecutiveMonthsAtRate(txs, 0.25, NOW)).toBe(1);
  });
});
