import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-12T00:00:00Z');

/** Seed 6 months of clean history: $5,000 income and $1,000 rent per month,
 *  which is an 80% savings rate, comfortably above any target under test. */
async function seedSteadyHistory(): Promise<void> {
  const { db } = await import('../src/db/client.js');
  const { transactions } = await import('../src/db/schema.js');
  const rows = [];
  for (let back = 1; back <= 6; back++) {
    const d = new Date(NOW);
    d.setMonth(d.getMonth() - back);
    const ym = d.toISOString().slice(0, 7);
    rows.push({
      transactionId: `tx-inc-${back}`,
      userId: testUserId,
      accountId: 'acct-1',
      amount: '5000',
      date: `${ym}-01`,
      category: 'paycheck',
    });
    rows.push({
      transactionId: `tx-rent-${back}`,
      userId: testUserId,
      accountId: 'acct-1',
      amount: '-1000',
      date: `${ym}-10`,
      category: 'rent',
    });
  }
  await db().insert(transactions).values(rows);
}

function inputs(over = {}) {
  return {
    hasConnectedAccount: true,
    liquidCash: 10_000,
    highAprDebtBalances: [] as number[],
    investedTotal: 20_000,
    taxAdvantagedRate: null,
    netWorth: { totalUsd: 30_000, byClass: { bank: 10_000, investments: 20_000 } },
    ...over,
  };
}

describe('refreshGoalSystem', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists the derived state computed from transaction history', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');
    const { getDerivedState } = await import('../src/store/goals.js');

    await refreshGoalSystem(testUserId, inputs(), NOW);

    const derived = await getDerivedState(testUserId);
    expect(derived?.takeHomeMonthly).toBe(5000);
    expect(derived?.liquidCash).toBe(10_000);
  });

  it('evaluates and persists the ladder with its inputs', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');
    const { getLadderState, getLadderInputs } = await import('../src/store/goals.js');

    await refreshGoalSystem(testUserId, inputs(), NOW);

    const state = await getLadderState(testUserId);
    expect(state?.rungs['0']?.status).toBe('completed');
    const stored = await getLadderInputs(testUserId);
    expect(stored?.liquidCash).toBe(10_000);
  });

  it('records exactly one net worth point for the day', async () => {
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');
    const { netWorthPointCount, latestNetWorth } = await import('../src/store/goals.js');

    await refreshGoalSystem(testUserId, inputs(), NOW);
    await refreshGoalSystem(testUserId, inputs({ netWorth: { totalUsd: 31_000, byClass: {} } }), NOW);

    expect(await netWorthPointCount(testUserId)).toBe(1);
    expect((await latestNetWorth(testUserId))?.totalUsd).toBe(31_000);
  });

  it('skips the net worth point when none is supplied', async () => {
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');
    const { netWorthPointCount } = await import('../src/store/goals.js');

    await refreshGoalSystem(testUserId, inputs({ netWorth: null }), NOW);
    expect(await netWorthPointCount(testUserId)).toBe(0);
  });

  it('advances the pet stage from completed rungs', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');
    const { getPetStage } = await import('../src/store/goals.js');

    const result = await refreshGoalSystem(testUserId, inputs(), NOW);
    expect(result.stage).toBeGreaterThan(0);
    expect(await getPetStage(testUserId)).toBe(result.stage);
  });

  it('always feeds employerMatch as unknown, leaving rung 2 uncompleted', async () => {
    // Founder decision: no employer-match storage or intake exists anywhere.
    await seedSteadyHistory();
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');

    const result = await refreshGoalSystem(testUserId, inputs(), NOW);
    expect(result.context.employerMatch).toBe('unknown');
    expect(result.ladder.rungs['2']?.status).not.toBe('completed');
  });

  it('keeps rung 5 indeterminate because taxAdvantagedRate has no producer', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');

    const result = await refreshGoalSystem(testUserId, inputs(), NOW);
    expect(result.context.taxAdvantagedRate).toBeNull();
    expect(result.ladder.rungs['5']?.status).not.toBe('completed');
  });

  it('propagates unknown liquid cash as null, never zero', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');

    const result = await refreshGoalSystem(testUserId, inputs({ liquidCash: null }), NOW);
    expect(result.derived.liquidCash).toBeNull();
    expect(result.ladder.rungs['1']?.status).not.toBe('completed');
  });

  it('counts the surplus streak against the default rate', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');

    const result = await refreshGoalSystem(testUserId, inputs(), NOW);
    // 80% savings rate for 6 months, capped at a 12-month lookback.
    expect(result.context.monthsAtSurplusRate).toBeGreaterThanOrEqual(3);
    expect(result.ladder.rungs['6']?.status).toBe('completed');
  });

  it('counts the surplus streak against a declared rate instead', async () => {
    await seedSteadyHistory();
    const { updateDeclarations } = await import('../src/store/declarations.js');
    const { refreshGoalSystem } = await import('../src/goals/refresh.js');

    // A 90% target no month meets: the streak must be zero.
    await updateDeclarations(testUserId, { surplusTargetRate: 0.9 }, NOW);
    const result = await refreshGoalSystem(testUserId, inputs(), NOW);
    expect(result.context.monthsAtSurplusRate).toBe(0);
  });
});

describe('reevaluateWithDeclarations', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('re-judges the ladder against stored inputs after a rate change', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem, reevaluateWithDeclarations } = await import('../src/goals/refresh.js');
    const { updateDeclarations } = await import('../src/store/declarations.js');

    // Simulated contribution rate below the 15% default: rung 5 stays open.
    const first = await refreshGoalSystem(testUserId, inputs({ taxAdvantagedRate: 0.1 }), NOW);
    expect(first.ladder.rungs['5']?.status).not.toBe('completed');

    // Lowering the declared target to 10% completes it without a new snapshot.
    await updateDeclarations(testUserId, { shelteredTargetRate: 0.1 }, NOW);
    const after = await reevaluateWithDeclarations(testUserId, NOW);
    expect(after?.rungs['5']?.status).toBe('completed');
  });

  it('returns the stored ladder untouched when no inputs were ever stored', async () => {
    const { reevaluateWithDeclarations } = await import('../src/goals/refresh.js');
    expect(await reevaluateWithDeclarations(testUserId, NOW)).toBeNull();
  });
});

describe('ladderView', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns null when the pipeline has never run', async () => {
    const { ladderView } = await import('../src/goals/refresh.js');
    expect(ladderView(null, null)).toBeNull();
  });

  it('reports the active rung with live progress, target and gap', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem, ladderView } = await import('../src/goals/refresh.js');
    const { getLadderState, getLadderInputs } = await import('../src/store/goals.js');

    // $1,500 on hand against the $2,000 starter buffer: rung 1 active at 75%.
    await refreshGoalSystem(testUserId, inputs({ liquidCash: 1500 }), NOW);
    const view = ladderView(await getLadderState(testUserId), await getLadderInputs(testUserId));

    expect(view?.currentRung).toBe(1);
    expect(view?.activeRung?.key).toBe('floor');
    expect(view?.activeRung?.progress).toBeCloseTo(0.75, 5);
    expect(view?.activeRung?.target).toBe(2000);
    expect(view?.activeRung?.gap).toBe(500);
    expect(view?.activeRung?.indeterminate).toBe(false);
  });

  it('marks the active rung indeterminate when inputs are missing', async () => {
    const { evaluateLadder } = await import('../src/goals/ladder.js');
    const { ladderView } = await import('../src/goals/refresh.js');
    const state = evaluateLadder(
      {
        hasConnectedAccount: true,
        essentialMonthly: null,
        incomeVolatility: null,
        takeHomeMonthly: null,
        liquidCash: null,
        savingsRate: null,
        monthsAtSurplusRate: 0,
        highAprDebtBalances: [],
        investedTotal: null,
        taxAdvantagedRate: null,
        employerMatch: 'unknown',
        shelteredTargetRate: null,
        surplusTargetRate: null,
      },
      null,
      NOW,
    );

    const view = ladderView(state, null);
    expect(view?.activeRung?.indeterminate).toBe(true);
  });

  it('lists a violated completed rung as reopened', async () => {
    await seedSteadyHistory();
    const { refreshGoalSystem, ladderView } = await import('../src/goals/refresh.js');
    const { getLadderState, getLadderInputs } = await import('../src/store/goals.js');

    // Clean first, then new high-APR debt appears: rung 3 stays completed but reopens.
    await refreshGoalSystem(testUserId, inputs({ highAprDebtBalances: [] }), NOW);
    await refreshGoalSystem(testUserId, inputs({ highAprDebtBalances: [8200] }), NOW);

    const view = ladderView(await getLadderState(testUserId), await getLadderInputs(testUserId));
    expect(view?.rungs['3']?.status).toBe('completed');
    expect(view?.reopened.map((r) => r.key)).toContain('bleeding_stopped');
  });
});
