// Persistence for target goals (docs/prd.md §7.2) and guardrail periods
// (§7.3). Every function is scoped by userId: a goal, pace row, or period can
// never be read or mutated across users (.claude/rules/security.md #6).

import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { goalPace, goalPeriods, goals, transactions } from '../db/schema.js';
import type { GuardrailKey, GuardrailOutcome, Period } from '../goals/guardrails.js';
import type { ContributionTransaction, GapAction, GoalPace, PaceBand } from '../goals/pace.js';

/** R-7.9: hard cap on simultaneously active target goals. Enforced here in the
 *  store, inside a transaction, so no client and no future route can create a
 *  fourth. Concentration beats dispersal. */
export const MAX_ACTIVE_GOALS = 3;

export type GoalKind = 'save' | 'payoff' | 'purchase';

export type ContributionRule = {
  type: 'recurring' | 'roundup' | 'manual';
  amountUsd: number | null;
  cadence: 'weekly' | 'biweekly' | 'monthly' | null;
  dayOfMonth: number | null;
};

export type TargetGoal = {
  id: number;
  name: string;
  emoji: string | null;
  kind: GoalKind;
  targetAmountUsd: number;
  targetDate: string | null;
  fundingAccountId: string | null;
  countsExistingBalance: boolean;
  contributionRule: ContributionRule | null;
  recurringAnnual: boolean;
  createdAt: string;
  achievedAt: string | null;
  archivedAt: string | null;
};

export type GoalCreateInput = {
  name: string;
  emoji: string | null;
  kind: GoalKind;
  targetAmountUsd: number;
  targetDate: string | null;
  fundingAccountId: string | null;
  countsExistingBalance: boolean;
  contributionRule: ContributionRule;
  recurringAnnual: boolean;
};

// Spelled out rather than Partial<GoalCreateInput> because
// exactOptionalPropertyTypes makes Partial reject the explicit `undefined`
// values Zod's .optional() produces.
export type GoalPatch = {
  name?: string | undefined;
  emoji?: string | null | undefined;
  kind?: GoalKind | undefined;
  targetAmountUsd?: number | undefined;
  targetDate?: string | null | undefined;
  fundingAccountId?: string | null | undefined;
  countsExistingBalance?: boolean | undefined;
  contributionRule?: ContributionRule | undefined;
  recurringAnnual?: boolean | undefined;
};

function num(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function toGoal(row: typeof goals.$inferSelect): TargetGoal {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    // Stored values only ever come from the validated create/update paths.
    kind: row.kind as GoalKind,
    targetAmountUsd: num(row.targetAmountUsd) ?? 0,
    targetDate: row.targetDate,
    fundingAccountId: row.fundingAccountId,
    countsExistingBalance: row.countsExistingBalance,
    contributionRule: (row.contributionRule as ContributionRule | null) ?? null,
    recurringAnnual: row.recurringAnnual,
    createdAt: row.createdAt.toISOString(),
    achievedAt: row.achievedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

function activeGoalFilter(userId: string) {
  // Active means neither archived nor achieved: an achieved goal keeps its
  // celebration row but frees its slot (spec-silent choice, documented in the
  // API module).
  return and(eq(goals.userId, userId), isNull(goals.archivedAt), isNull(goals.achievedAt));
}

/** Create a goal, enforcing the three-active cap atomically. Returns null when
 *  the cap is hit so the route can answer with the specific limit error. */
export async function createGoal(userId: string, input: GoalCreateInput, now: Date): Promise<TargetGoal | null> {
  return db().transaction(async (tx) => {
    const [row] = await tx
      .select({ n: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(goals)
      .where(activeGoalFilter(userId));
    if ((row?.n ?? 0) >= MAX_ACTIVE_GOALS) return null;

    const [created] = await tx
      .insert(goals)
      .values({
        userId,
        name: input.name,
        emoji: input.emoji,
        kind: input.kind,
        targetAmountUsd: String(input.targetAmountUsd),
        targetDate: input.targetDate,
        fundingAccountId: input.fundingAccountId,
        countsExistingBalance: input.countsExistingBalance,
        contributionRule: input.contributionRule,
        recurringAnnual: input.recurringAnnual,
        createdAt: now,
      })
      .returning();
    return toGoal(created as typeof goals.$inferSelect);
  });
}

export async function listGoals(userId: string, includeArchived: boolean): Promise<TargetGoal[]> {
  const where = includeArchived ? eq(goals.userId, userId) : and(eq(goals.userId, userId), isNull(goals.archivedAt));
  const rows = await db().select().from(goals).where(where).orderBy(asc(goals.createdAt), asc(goals.id));
  return rows.map(toGoal);
}

/** Goals the refresh evaluates: everything not archived, including achieved
 *  ones (a recurring sinking fund resets after achievement). */
export async function listUnarchivedGoals(userId: string): Promise<TargetGoal[]> {
  return listGoals(userId, false);
}

export async function getGoal(userId: string, id: number): Promise<TargetGoal | null> {
  const [row] = await db()
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, id)));
  return row ? toGoal(row) : null;
}

export async function updateGoal(userId: string, id: number, patch: GoalPatch): Promise<TargetGoal | null> {
  const set: Partial<typeof goals.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.emoji !== undefined) set.emoji = patch.emoji;
  if (patch.kind !== undefined) set.kind = patch.kind;
  if (patch.targetAmountUsd !== undefined) set.targetAmountUsd = String(patch.targetAmountUsd);
  if (patch.targetDate !== undefined) set.targetDate = patch.targetDate;
  if (patch.fundingAccountId !== undefined) set.fundingAccountId = patch.fundingAccountId;
  if (patch.countsExistingBalance !== undefined) set.countsExistingBalance = patch.countsExistingBalance;
  if (patch.contributionRule !== undefined) set.contributionRule = patch.contributionRule;
  if (patch.recurringAnnual !== undefined) set.recurringAnnual = patch.recurringAnnual;

  if (Object.keys(set).length === 0) return getGoal(userId, id);

  const [row] = await db()
    .update(goals)
    .set(set)
    .where(and(eq(goals.userId, userId), eq(goals.id, id)))
    .returning();
  return row ? toGoal(row) : null;
}

/** Soft delete (R-7.9: "a fourth requires archiving one"). Idempotent.
 *  Returns the goal actually archived by THIS call, or null when nothing
 *  matched (missing id or already archived), so the caller can emit
 *  goal_archived exactly once per real transition. */
export async function archiveGoal(userId: string, id: number, now: Date): Promise<TargetGoal | null> {
  const [row] = await db()
    .update(goals)
    .set({ archivedAt: now })
    .where(and(eq(goals.userId, userId), eq(goals.id, id), isNull(goals.archivedAt)))
    .returning();
  return row ? toGoal(row) : null;
}

export async function markGoalAchieved(userId: string, id: number, now: Date): Promise<void> {
  await db()
    .update(goals)
    .set({ achievedAt: now })
    .where(and(eq(goals.userId, userId), eq(goals.id, id), isNull(goals.achievedAt)));
}

/** Sinking-fund reset (R-7.7): a recurring annual goal that completed rolls its
 *  target date forward a year and starts counting again. */
export async function resetRecurringGoal(userId: string, id: number, nextTargetDate: string): Promise<void> {
  await db()
    .update(goals)
    .set({ targetDate: nextTargetDate, achievedAt: null })
    .where(and(eq(goals.userId, userId), eq(goals.id, id)));
}

// --- Funding-account activity (pace inputs) ---------------------------------

export type FundingActivity = {
  transactions: ContributionTransaction[];
  earliestTransactionDate: string | null;
};

/** Transactions on one funding account inside `windowDays`, plus the earliest
 *  date ever seen on it (needed to tell "quiet account" from "young account").
 *  Scoped by userId so an account id copied from another user reads empty. */
export async function getFundingActivity(
  userId: string,
  accountId: string,
  now: Date,
  windowDays: number,
): Promise<FundingActivity> {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const scope = and(eq(transactions.userId, userId), eq(transactions.accountId, accountId));
  const [rows, [earliest]] = await Promise.all([
    db()
      .select({ date: transactions.date, amount: transactions.amount })
      .from(transactions)
      .where(and(scope, gte(transactions.date, cutoffStr))),
    // ISO dates sort lexicographically, so MIN over the text column is correct.
    db()
      .select({ min: sql<string | null>`MIN(${transactions.date})` })
      .from(transactions)
      .where(scope),
  ]);

  return {
    transactions: rows
      .map((r) => ({ date: r.date, amount: parseFloat(r.amount) }))
      .filter((r) => Number.isFinite(r.amount)),
    earliestTransactionDate: earliest?.min ?? null,
  };
}

// --- Pace persistence -------------------------------------------------------

function numToStr(v: number | null): string | null {
  return v === null ? null : String(v);
}

export async function saveGoalPace(userId: string, goalId: number, pace: GoalPace, now: Date): Promise<void> {
  const values = {
    goalId,
    userId,
    currentAmountUsd: numToStr(pace.currentAmountUsd),
    monthsRemaining: numToStr(pace.monthsRemaining),
    requiredRunRateUsd: numToStr(pace.requiredRunRateUsd),
    actualRunRateUsd: numToStr(pace.actualRunRateUsd),
    contributionHistoryDays: pace.contributionHistoryDays,
    pace: numToStr(pace.pace),
    paceBand: pace.paceBand,
    gapAction: pace.gapAction,
    computedAt: now,
  };
  await db().insert(goalPace).values(values).onConflictDoUpdate({ target: goalPace.goalId, set: values });
}

export type StoredGoalPace = {
  currentAmountUsd: number | null;
  monthsRemaining: number | null;
  requiredRunRateUsd: number | null;
  actualRunRateUsd: number | null;
  contributionHistoryDays: number | null;
  pace: number | null;
  paceBand: PaceBand | null;
  gapAction: GapAction | null;
  computedAt: string;
};

export async function getGoalPaces(userId: string): Promise<Map<number, StoredGoalPace>> {
  const rows = await db().select().from(goalPace).where(eq(goalPace.userId, userId));
  const map = new Map<number, StoredGoalPace>();
  for (const row of rows) {
    map.set(row.goalId, {
      currentAmountUsd: num(row.currentAmountUsd),
      monthsRemaining: num(row.monthsRemaining),
      requiredRunRateUsd: num(row.requiredRunRateUsd),
      actualRunRateUsd: num(row.actualRunRateUsd),
      contributionHistoryDays: row.contributionHistoryDays,
      pace: num(row.pace),
      paceBand: (row.paceBand as PaceBand | null) ?? null,
      gapAction: row.gapAction ?? null,
      computedAt: row.computedAt.toISOString(),
    });
  }
  return map;
}

// --- Guardrail periods ------------------------------------------------------

export type StoredGoalPeriod = {
  guardrailKey: GuardrailKey;
  periodStart: string;
  periodEnd: string;
  outcome: string;
  targetValue: number | null;
  actualValue: number | null;
  repairUsed: boolean;
  evaluatedAt: string | null;
};

export async function listGoalPeriods(userId: string, guardrailKey?: GuardrailKey): Promise<StoredGoalPeriod[]> {
  const where = guardrailKey
    ? and(eq(goalPeriods.userId, userId), eq(goalPeriods.guardrailKey, guardrailKey))
    : eq(goalPeriods.userId, userId);
  const rows = await db().select().from(goalPeriods).where(where).orderBy(asc(goalPeriods.periodStart));
  return rows.map((row) => ({
    guardrailKey: row.guardrailKey as GuardrailKey,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    outcome: row.outcome,
    targetValue: num(row.targetValue),
    actualValue: num(row.actualValue),
    repairUsed: row.repairUsed,
    evaluatedAt: row.evaluatedAt?.toISOString() ?? null,
  }));
}

export async function upsertGoalPeriod(
  userId: string,
  guardrailKey: GuardrailKey,
  period: Period,
  outcome: GuardrailOutcome,
  targetValue: number | null,
  actualValue: number | null,
  repairUsed: boolean,
  now: Date,
): Promise<void> {
  const values = {
    userId,
    guardrailKey,
    periodStart: period.start,
    periodEnd: period.end,
    outcome,
    targetValue: numToStr(targetValue),
    actualValue: numToStr(actualValue),
    repairUsed,
    evaluatedAt: now,
  };
  await db()
    .insert(goalPeriods)
    .values(values)
    .onConflictDoUpdate({
      target: [goalPeriods.userId, goalPeriods.guardrailKey, goalPeriods.periodStart],
      set: {
        periodEnd: values.periodEnd,
        outcome: values.outcome,
        targetValue: values.targetValue,
        actualValue: values.actualValue,
        repairUsed: values.repairUsed,
        evaluatedAt: values.evaluatedAt,
      },
    });
}
