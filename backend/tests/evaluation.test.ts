import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-13T00:00:00Z');

function goalInput(over = {}) {
  return {
    name: 'House deposit',
    emoji: null,
    kind: 'save' as const,
    targetAmountUsd: 10_000,
    targetDate: '2027-08-01',
    fundingAccountId: 'acct-goal',
    countsExistingBalance: true,
    contributionRule: { type: 'recurring' as const, amountUsd: null, cadence: null, dayOfMonth: null },
    recurringAnnual: false,
    ...over,
  };
}

/** Four months of +500 deposits into the goal account, so the account has well
 *  over 30 days of history and a measurable run rate. */
async function seedDeposits(): Promise<void> {
  const { db } = await import('../src/db/client.js');
  const { transactions } = await import('../src/db/schema.js');
  const rows = [];
  for (let back = 1; back <= 4; back++) {
    const d = new Date(NOW);
    d.setUTCMonth(d.getUTCMonth() - back);
    rows.push({
      transactionId: `dep-${back}`,
      userId: testUserId,
      accountId: 'acct-goal',
      amount: '500',
      date: d.toISOString().slice(0, 10),
      category: 'transfer',
    });
  }
  await db().insert(transactions).values(rows);
}

describe('evaluateGoalSystem pace', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists a pace row per goal with the funding balance as current', async () => {
    await seedDeposits();
    const { createGoal, getGoalPaces } = await import('../src/store/target-goals.js');
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    const goal = await createGoal(testUserId, goalInput(), NOW);

    await evaluateGoalSystem(testUserId, { accountBalances: { 'acct-goal': 2_000 }, surplusTargetRate: null }, NOW);

    const paces = await getGoalPaces(testUserId);
    const pace = paces.get((goal as { id: number }).id);
    expect(pace?.currentAmountUsd).toBe(2_000);
    expect(pace?.actualRunRateUsd).not.toBeNull();
    expect(pace?.paceBand).not.toBeNull();
  });

  it('stores a null pace, not off_pace, when balances are unknown', async () => {
    await seedDeposits();
    const { createGoal, getGoalPaces } = await import('../src/store/target-goals.js');
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    const goal = await createGoal(testUserId, goalInput(), NOW);

    await evaluateGoalSystem(testUserId, { accountBalances: null, surplusTargetRate: null }, NOW);

    const pace = (await getGoalPaces(testUserId)).get((goal as { id: number }).id);
    expect(pace?.currentAmountUsd).toBeNull();
    expect(pace?.pace).toBeNull();
    expect(pace?.paceBand).toBeNull();
  });

  it('marks a goal achieved when the balance meets the target', async () => {
    await seedDeposits();
    const { createGoal, getGoal } = await import('../src/store/target-goals.js');
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    const goal = await createGoal(testUserId, goalInput({ targetAmountUsd: 1_500 }), NOW);

    await evaluateGoalSystem(testUserId, { accountBalances: { 'acct-goal': 2_000 }, surplusTargetRate: null }, NOW);

    const after = await getGoal(testUserId, (goal as { id: number }).id);
    expect(after?.achievedAt).not.toBeNull();
  });

  it('rolls an achieved recurring annual goal forward a year once its date passes', async () => {
    await seedDeposits();
    const { createGoal, getGoal } = await import('../src/store/target-goals.js');
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    const goal = await createGoal(
      testUserId,
      goalInput({ targetAmountUsd: 1_000, targetDate: '2026-08-01', recurringAnnual: true }),
      NOW,
    );

    await evaluateGoalSystem(testUserId, { accountBalances: { 'acct-goal': 2_000 }, surplusTargetRate: null }, NOW);

    const after = await getGoal(testUserId, (goal as { id: number }).id);
    expect(after?.targetDate).toBe('2027-08-01');
    expect(after?.achievedAt).toBeNull();
  });
});

describe('evaluateGoalSystem guardrail periods', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('writes period rows for every guardrail', async () => {
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    const { listGoalPeriods } = await import('../src/store/target-goals.js');

    await evaluateGoalSystem(testUserId, { accountBalances: null, surplusTargetRate: null }, NOW);

    const rows = await listGoalPeriods(testUserId);
    const keys = new Set(rows.map((r) => r.guardrailKey));
    expect(keys.size).toBe(7);
  });

  it('evaluates sourceless guardrails to indeterminate, never missed', async () => {
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    const { listGoalPeriods } = await import('../src/store/target-goals.js');

    await evaluateGoalSystem(testUserId, { accountBalances: null, surplusTargetRate: null }, NOW);

    for (const key of ['utilization_before_close', 'debt_principal_paid'] as const) {
      const rows = await listGoalPeriods(testUserId, key);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row.outcome).toBe('indeterminate');
    }
  });

  it('a data-less user fails nothing anywhere', async () => {
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    const { listGoalPeriods } = await import('../src/store/target-goals.js');

    await evaluateGoalSystem(testUserId, { accountBalances: null, surplusTargetRate: null }, NOW);

    const rows = await listGoalPeriods(testUserId);
    expect(rows.every((r) => r.outcome !== 'missed')).toBe(true);
  });

  it('spends a repair token automatically when a miss would break a streak', async () => {
    // Two passed weeks on record, then a week where the goal account only saw
    // an outflow: the miss should arrive pre-repaired.
    const { createGoal, listGoalPeriods, upsertGoalPeriod } = await import('../src/store/target-goals.js');
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');
    await createGoal(testUserId, goalInput(), NOW);

    await upsertGoalPeriod(
      testUserId,
      'contribution_streak',
      { start: '2026-07-20', end: '2026-07-26' },
      'passed',
      0,
      100,
      false,
      NOW,
    );
    await upsertGoalPeriod(
      testUserId,
      'contribution_streak',
      { start: '2026-07-27', end: '2026-08-02' },
      'passed',
      0,
      100,
      false,
      NOW,
    );

    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');
    await db()
      .insert(transactions)
      .values([
        // History old enough to cover every evaluated week.
        { transactionId: 'w0', userId: testUserId, accountId: 'acct-goal', amount: '100', date: '2026-06-01' },
        { transactionId: 'w1', userId: testUserId, accountId: 'acct-goal', amount: '-40', date: '2026-08-05' },
      ]);

    await evaluateGoalSystem(testUserId, { accountBalances: null, surplusTargetRate: null }, NOW);

    const rows = await listGoalPeriods(testUserId, 'contribution_streak');
    const missedWeek = rows.find((r) => r.periodStart === '2026-08-03');
    expect(missedWeek?.outcome).toBe('missed');
    expect(missedWeek?.repairUsed).toBe(true);
  });

  it('does not overwrite a final outcome on re-evaluation', async () => {
    const { listGoalPeriods, upsertGoalPeriod } = await import('../src/store/target-goals.js');
    const { evaluateGoalSystem } = await import('../src/goals/evaluation.js');

    // Pretend an earlier run already passed the last closed week.
    await upsertGoalPeriod(
      testUserId,
      'contribution_streak',
      { start: '2026-08-03', end: '2026-08-09' },
      'passed',
      0,
      100,
      false,
      NOW,
    );

    await evaluateGoalSystem(testUserId, { accountBalances: null, surplusTargetRate: null }, NOW);

    const rows = await listGoalPeriods(testUserId, 'contribution_streak');
    const week = rows.find((r) => r.periodStart === '2026-08-03');
    expect(week?.outcome).toBe('passed');
  });
});
