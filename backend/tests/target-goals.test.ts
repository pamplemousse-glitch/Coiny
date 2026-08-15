import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-13T00:00:00Z');

function goalInput(over = {}) {
  return {
    name: 'Emergency fund',
    emoji: null,
    kind: 'save' as const,
    targetAmountUsd: 5_000,
    targetDate: '2027-06-01',
    fundingAccountId: 'acct-goal',
    countsExistingBalance: true,
    contributionRule: { type: 'recurring' as const, amountUsd: 200, cadence: 'monthly' as const, dayOfMonth: 1 },
    recurringAnnual: false,
    ...over,
  };
}

describe('createGoal', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates and returns the goal', async () => {
    const { createGoal } = await import('../src/store/target-goals.js');
    const goal = await createGoal(testUserId, goalInput(), NOW);
    expect(goal?.name).toBe('Emergency fund');
    expect(goal?.targetAmountUsd).toBe(5_000);
  });

  it('refuses a fourth active goal', async () => {
    const { createGoal } = await import('../src/store/target-goals.js');
    for (let i = 0; i < 3; i++) {
      expect(await createGoal(testUserId, goalInput({ name: `Goal ${i}` }), NOW)).not.toBeNull();
    }
    expect(await createGoal(testUserId, goalInput({ name: 'One too many' }), NOW)).toBeNull();
  });

  it('frees a slot when a goal is archived', async () => {
    const { archiveGoal, createGoal } = await import('../src/store/target-goals.js');
    const first = await createGoal(testUserId, goalInput({ name: 'Goal 0' }), NOW);
    for (let i = 1; i < 3; i++) {
      await createGoal(testUserId, goalInput({ name: `Goal ${i}` }), NOW);
    }
    await archiveGoal(testUserId, (first as { id: number }).id, NOW);
    expect(await createGoal(testUserId, goalInput({ name: 'Replacement' }), NOW)).not.toBeNull();
  });

  it('frees a slot when a goal is achieved', async () => {
    const { createGoal, markGoalAchieved } = await import('../src/store/target-goals.js');
    const first = await createGoal(testUserId, goalInput({ name: 'Goal 0' }), NOW);
    for (let i = 1; i < 3; i++) {
      await createGoal(testUserId, goalInput({ name: `Goal ${i}` }), NOW);
    }
    await markGoalAchieved(testUserId, (first as { id: number }).id, NOW);
    expect(await createGoal(testUserId, goalInput({ name: 'Next up' }), NOW)).not.toBeNull();
  });
});

describe('user scoping', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('never returns another user’s goal', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { createGoal, getGoal, listGoals } = await import('../src/store/target-goals.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_user_sub', email: 'other@coiny.test' });
    const theirs = await createGoal(otherId, goalInput({ name: 'Not yours' }), NOW);

    expect(await getGoal(testUserId, (theirs as { id: number }).id)).toBeNull();
    expect(await listGoals(testUserId, true)).toHaveLength(0);
  });

  it('never archives another user’s goal', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { archiveGoal, createGoal, getGoal } = await import('../src/store/target-goals.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_user_sub', email: 'other@coiny.test' });
    const theirs = await createGoal(otherId, goalInput({ name: 'Not yours' }), NOW);

    await archiveGoal(testUserId, (theirs as { id: number }).id, NOW);
    const after = await getGoal(otherId, (theirs as { id: number }).id);
    expect(after?.archivedAt).toBeNull();
  });
});

describe('updateGoal and listGoals', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('applies a partial patch', async () => {
    const { createGoal, updateGoal } = await import('../src/store/target-goals.js');
    const goal = await createGoal(testUserId, goalInput(), NOW);
    const updated = await updateGoal(testUserId, (goal as { id: number }).id, { targetAmountUsd: 6_500 });
    expect(updated?.targetAmountUsd).toBe(6_500);
    expect(updated?.name).toBe('Emergency fund');
  });

  it('excludes archived goals unless asked', async () => {
    const { archiveGoal, createGoal, listGoals } = await import('../src/store/target-goals.js');
    const goal = await createGoal(testUserId, goalInput(), NOW);
    await archiveGoal(testUserId, (goal as { id: number }).id, NOW);
    expect(await listGoals(testUserId, false)).toHaveLength(0);
    expect(await listGoals(testUserId, true)).toHaveLength(1);
  });
});

describe('getFundingActivity', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('reports transactions and the earliest date for the scoped account', async () => {
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');
    await db()
      .insert(transactions)
      .values([
        { transactionId: 'tg-1', userId: testUserId, accountId: 'acct-goal', amount: '250', date: '2026-07-01' },
        { transactionId: 'tg-2', userId: testUserId, accountId: 'acct-goal', amount: '250', date: '2026-08-01' },
        { transactionId: 'tg-3', userId: testUserId, accountId: 'acct-other', amount: '999', date: '2026-08-01' },
      ]);

    const { getFundingActivity } = await import('../src/store/target-goals.js');
    const activity = await getFundingActivity(testUserId, 'acct-goal', NOW, 120);
    expect(activity.transactions).toHaveLength(2);
    expect(activity.earliestTransactionDate).toBe('2026-07-01');
  });

  it('reads empty for an account id belonging to another user', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_user_sub', email: 'other@coiny.test' });
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');
    await db()
      .insert(transactions)
      .values([{ transactionId: 'tg-4', userId: otherId, accountId: 'acct-goal', amount: '250', date: '2026-07-01' }]);

    const { getFundingActivity } = await import('../src/store/target-goals.js');
    const activity = await getFundingActivity(testUserId, 'acct-goal', NOW, 120);
    expect(activity.transactions).toHaveLength(0);
    expect(activity.earliestTransactionDate).toBeNull();
  });
});

describe('goal periods', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('upserts idempotently on (user, guardrail, periodStart)', async () => {
    const { listGoalPeriods, upsertGoalPeriod } = await import('../src/store/target-goals.js');
    const period = { start: '2026-08-03', end: '2026-08-09' };
    await upsertGoalPeriod(testUserId, 'contribution_streak', period, 'indeterminate', null, null, false, NOW);
    await upsertGoalPeriod(testUserId, 'contribution_streak', period, 'passed', 0, 150, false, NOW);

    const rows = await listGoalPeriods(testUserId, 'contribution_streak');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outcome).toBe('passed');
    expect(rows[0]?.actualValue).toBe(150);
  });
});
