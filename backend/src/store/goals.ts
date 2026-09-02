import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  derivedState,
  goalPeriods,
  ladderState,
  netWorthDaily,
  petProgression,
  transactions,
  users,
} from '../db/schema.js';
import {
  computeDerivedState,
  type DerivedInputTransaction,
  type DerivedState,
  monthlySavingsRate,
} from '../goals/derived.js';
import { evaluateLadder, type LadderContext, type LadderState, stageForLadder } from '../goals/ladder.js';
import { reactionForEvent } from '../reactions/contract.js';
import { performReactions } from '../reactions/perform.js';
import { log } from '../util/log.js';
import { trackServerEvent } from './analytics.js';

/** Bumped when the derived-state computation changes in a way that makes stored
 *  values incomparable to freshly computed ones. Lets a later migration find and
 *  recompute stale rows instead of silently mixing two definitions. */
export const DERIVED_COMPUTE_VERSION = 1;

function num(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: number | null): string | null {
  return v === null ? null : String(v);
}

// --- Derived state (Layer 0) ----------------------------------------------

export async function getDerivedState(userId: string): Promise<DerivedState | null> {
  const [row] = await db().select().from(derivedState).where(eq(derivedState.userId, userId));
  if (!row) return null;
  return {
    takeHomeMonthly: num(row.takeHomeMonthly),
    incomeVolatility: num(row.incomeVolatility),
    essentialMonthly: num(row.essentialMonthly),
    discretionaryMonthly: num(row.discretionaryMonthly),
    liquidCash: num(row.liquidCash),
    runwayMonths: num(row.runwayMonths),
    savingsRate: num(row.savingsRate),
  };
}

export async function saveDerivedState(userId: string, state: DerivedState, now: Date): Promise<void> {
  const values = {
    userId,
    takeHomeMonthly: str(state.takeHomeMonthly),
    incomeVolatility: str(state.incomeVolatility),
    essentialMonthly: str(state.essentialMonthly),
    discretionaryMonthly: str(state.discretionaryMonthly),
    liquidCash: str(state.liquidCash),
    runwayMonths: str(state.runwayMonths),
    savingsRate: str(state.savingsRate),
    computedAt: now,
    computeVersion: DERIVED_COMPUTE_VERSION,
  };
  await db().insert(derivedState).values(values).onConflictDoUpdate({ target: derivedState.userId, set: values });
}

/** Recompute Layer 0 from the user's transaction history.
 *  `liquidCash` comes from the net worth assembly and is passed in rather than
 *  fetched, so this stays testable and does not fan out to external APIs. */
export async function refreshDerivedState(userId: string, liquidCash: number | null, now: Date): Promise<DerivedState> {
  // 13 months: 12 for the volatility window plus one for partial-month alignment.
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 13);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db()
    .select({ amount: transactions.amount, date: transactions.date, category: transactions.category })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, cutoffStr)));

  const state = computeDerivedState(rows as DerivedInputTransaction[], liquidCash, now);
  await saveDerivedState(userId, state, now);
  return state;
}

// --- Ladder (Layer 1) -----------------------------------------------------

export async function getLadderState(userId: string): Promise<LadderState | null> {
  const [row] = await db().select().from(ladderState).where(eq(ladderState.userId, userId));
  if (!row) return null;
  return { currentRung: row.currentRung, rungs: row.rungs };
}

export async function saveLadderState(userId: string, state: LadderState, now: Date): Promise<void> {
  const values = { userId, currentRung: state.currentRung, rungs: state.rungs, updatedAt: now };
  await db().insert(ladderState).values(values).onConflictDoUpdate({ target: ladderState.userId, set: values });
}

/** Persist the context the ladder was last evaluated against, so read paths can
 *  report the active rung's live progress without re-running the financial
 *  fan-out, and so a declaration change can re-evaluate immediately. */
export async function saveLadderInputs(
  userId: string,
  ctx: LadderContext,
  now: Date,
  inputsAsOf: Date | null = null,
): Promise<void> {
  const values = { userId, inputs: ctx, inputsAsOf, updatedAt: now };
  await db()
    .insert(ladderState)
    .values(values)
    .onConflictDoUpdate({ target: ladderState.userId, set: { inputs: ctx, inputsAsOf, updatedAt: now } });
}

export async function getLadderInputs(userId: string): Promise<LadderContext | null> {
  const [row] = await db().select().from(ladderState).where(eq(ladderState.userId, userId));
  return row?.inputs ?? null;
}

/** How old the money behind the ladder is (R-8.2). Null means unknown, which
 *  Home must render differently from fresh: a caller that treats null as "just
 *  now" reintroduces the unlabelled stale value this exists to prevent. */
export async function getLadderInputsAsOf(userId: string): Promise<Date | null> {
  const [row] = await db()
    .select({ inputsAsOf: ladderState.inputsAsOf })
    .from(ladderState)
    .where(eq(ladderState.userId, userId));
  return row?.inputsAsOf ?? null;
}

/** Re-evaluate the ladder and advance the creature's stage.
 *
 *  The stage is written only when it INCREASES. It is a monotonic high-water mark,
 *  not a mirror of the ladder, so no future change to rung evaluation can ever take
 *  away a stage a user already reached. */
export async function refreshLadder(userId: string, ctx: LadderContext, now: Date): Promise<LadderState> {
  const prior = await getLadderState(userId);
  const next = evaluateLadder(ctx, prior, now);
  await saveLadderState(userId, next, now);

  // Server-side instrumentation (prd.md R-24.2): ladder transitions are facts
  // the backend observed itself; the client is never asked to report them.
  // Emitted on the transition edge only, so a rung completing once emits once
  // no matter how many refreshes follow (rungs never un-complete).
  const priorRungs = prior?.rungs ?? {};
  const completedRungs: number[] = [];
  for (const [key, state] of Object.entries(next.rungs)) {
    const before = priorRungs[key]?.status ?? 'pending';
    if (state.status === 'completed' && before !== 'completed') {
      await trackServerEvent(userId, 'rung_completed', { rung_index: Number(key) });
      completedRungs.push(Number(key));
    }
    if (state.status === 'skipped' && before !== 'skipped') {
      await trackServerEvent(userId, 'rung_skipped', { rung_index: Number(key) });
    }
  }
  if (prior?.currentRung !== next.currentRung) {
    await trackServerEvent(userId, 'rung_started', { rung_index: next.currentRung });
  }

  // R-7.24: a rung completing is the loudest moment in the app. All completion
  // edges from this refresh go in as ONE candidate set, highest rung first: a
  // well-off user auto-completing rungs 0 to 5 on day one gets one
  // transformation, not six back-to-back (the creature has one body), and the
  // other five land in analytics as precedence-suppressed. Reaction failure
  // must never fail the ladder write, so this is best-effort.
  if (completedRungs.length > 0) {
    try {
      const candidates = [...completedRungs]
        .sort((a, b) => b - a)
        .map((idx) => ({
          name: 'ladder_rung_completed',
          reaction: reactionForEvent('ladder_rung_completed', `ladder_rung_completed (rung ${idx})`),
        }));
      await performReactions(userId, candidates, now);
    } catch (err) {
      log.warn({ err }, 'rung completion reaction failed');
    }
  }

  const stage = stageForLadder(next);
  const [progression] = await db().select().from(petProgression).where(eq(petProgression.userId, userId));

  if (!progression) {
    await db().insert(petProgression).values({ userId, stage, stageEnteredAt: now });
  } else if (stage > progression.stage) {
    await db().update(petProgression).set({ stage, stageEnteredAt: now }).where(eq(petProgression.userId, userId));
  }

  return next;
}

export async function getPetStage(userId: string): Promise<number> {
  const [row] = await db().select().from(petProgression).where(eq(petProgression.userId, userId));
  return row?.stage ?? 0;
}

// --- Guardrail periods (Layer 3) --------------------------------------------

export type GuardrailPeriodInput = {
  guardrailKey: string;
  /** ISO dates (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  outcome: 'passed' | 'missed' | 'pending' | 'not_applicable';
  targetValue: number | null;
  actualValue: number | null;
  repairUsed: boolean;
};

/** The single blessed writer for goal_periods. Upserts on (user, key, start) so
 *  re-evaluating a period corrects the row instead of duplicating it, and emits
 *  `guardrail_period_outcome` exactly when a period settles (transitions into
 *  passed / missed / not_applicable). Writing through it is what keeps the W4
 *  counter-metric (prd.md R-2.2) measurable for free. Amounts stay in the row;
 *  the analytics event carries the outcome only (R-22.6).
 *
 *  Currently unused, and the comment that used to sit here ("no guardrail
 *  evaluator exists yet") is why: it outlived the evaluator's arrival and was
 *  read as evidence that guardrails do not work. They do.
 *  `evaluateGuardrailPeriods` (goals/evaluation.ts) evaluates all seven and
 *  writes through `upsertGoalPeriod` (store/target-goals.ts) instead. Either
 *  route the evaluator through this function or delete it; do not leave a
 *  second writer sitting here describing a past that has moved on. */
export async function recordGuardrailPeriod(userId: string, input: GuardrailPeriodInput, now: Date): Promise<void> {
  const [existing] = await db()
    .select({ outcome: goalPeriods.outcome })
    .from(goalPeriods)
    .where(
      and(
        eq(goalPeriods.userId, userId),
        eq(goalPeriods.guardrailKey, input.guardrailKey),
        eq(goalPeriods.periodStart, input.periodStart),
      ),
    );

  await db()
    .insert(goalPeriods)
    .values({
      userId,
      guardrailKey: input.guardrailKey,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      outcome: input.outcome,
      targetValue: str(input.targetValue),
      actualValue: str(input.actualValue),
      repairUsed: input.repairUsed,
      evaluatedAt: now,
    })
    .onConflictDoUpdate({
      target: [goalPeriods.userId, goalPeriods.guardrailKey, goalPeriods.periodStart],
      set: {
        periodEnd: input.periodEnd,
        outcome: input.outcome,
        targetValue: str(input.targetValue),
        actualValue: str(input.actualValue),
        repairUsed: input.repairUsed,
        evaluatedAt: now,
      },
    });

  const settled = input.outcome !== 'pending';
  if (settled && existing?.outcome !== input.outcome) {
    await trackServerEvent(userId, 'guardrail_period_outcome', {
      guardrail_key: input.guardrailKey,
      outcome: input.outcome,
      repair_used: input.repairUsed,
    });
  }
}

export async function getGuardrailPeriods(
  userId: string,
  guardrailKey?: string,
): Promise<(typeof goalPeriods.$inferSelect)[]> {
  const where = guardrailKey
    ? and(eq(goalPeriods.userId, userId), eq(goalPeriods.guardrailKey, guardrailKey))
    : eq(goalPeriods.userId, userId);
  return db().select().from(goalPeriods).where(where).orderBy(desc(goalPeriods.periodStart));
}

// --- Net worth time series ------------------------------------------------

/** Record today's net worth. Idempotent per (user, date): re-running a sync on the
 *  same day overwrites rather than duplicating, so the series has exactly one point
 *  per day regardless of how often the job runs. */
export async function recordNetWorthDaily(
  userId: string,
  date: string,
  totalUsd: number,
  byClass: Record<string, number>,
): Promise<void> {
  const values = { userId, date, totalUsd: String(totalUsd), byClass, currency: 'USD' };
  await db()
    .insert(netWorthDaily)
    .values(values)
    .onConflictDoUpdate({
      target: [netWorthDaily.userId, netWorthDaily.date],
      set: { totalUsd: values.totalUsd, byClass: values.byClass },
    });
}

export type NetWorthPoint = { date: string; totalUsd: number; byClass: Record<string, number> };

export async function getNetWorthSeries(userId: string, days: number): Promise<NetWorthPoint[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await db()
    .select()
    .from(netWorthDaily)
    .where(and(eq(netWorthDaily.userId, userId), gte(netWorthDaily.date, cutoff.toISOString().slice(0, 10))))
    .orderBy(netWorthDaily.date);

  return rows.map((r) => ({ date: r.date, totalUsd: parseFloat(r.totalUsd), byClass: r.byClass }));
}

/** Consecutive whole months, ending with the most recent complete one, in which the
 *  savings rate met or exceeded `target`. Feeds ladder rung 6, which requires the
 *  rate to be SUSTAINED rather than hit once. */
export async function monthsAtSavingsRate(userId: string, target: number, now: Date): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 13);

  const rows = await db()
    .select({ amount: transactions.amount, date: transactions.date, category: transactions.category })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, cutoff.toISOString().slice(0, 10))));

  return countConsecutiveMonthsAtRate(rows as DerivedInputTransaction[], target, now);
}

/** Extracted and exported so the streak logic is testable without a database. */
export function countConsecutiveMonthsAtRate(txs: DerivedInputTransaction[], target: number, now: Date): number {
  let streak = 0;
  // Start from last month: the current month is incomplete and would understate
  // income for anyone paid at month end.
  for (let back = 1; back <= 12; back++) {
    const anchor = new Date(now);
    anchor.setMonth(anchor.getMonth() - back);
    const key = anchor.toISOString().slice(0, 7);

    // monthlySavingsRate, not computeDerivedState: the latter normalises outflow
    // over 90 days and would report a rate three times too generous here.
    const rate = monthlySavingsRate(txs, key);
    if (rate === null || rate < target) break;
    streak++;
  }
  return streak;
}

/** Most recent stored net worth, used as a fallback when a live assembly fails. */
export async function latestNetWorth(userId: string): Promise<NetWorthPoint | null> {
  const [row] = await db()
    .select()
    .from(netWorthDaily)
    .where(eq(netWorthDaily.userId, userId))
    .orderBy(desc(netWorthDaily.date))
    .limit(1);
  if (!row) return null;
  return { date: row.date, totalUsd: parseFloat(row.totalUsd), byClass: row.byClass };
}

/** Count of stored days, so callers can tell "no history yet" from "flat history". */
export async function netWorthPointCount(userId: string): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(netWorthDaily)
    .where(eq(netWorthDaily.userId, userId));
  return row?.count ?? 0;
}

/** User ids with no net_worth_daily row for the given date. The scheduler's
 *  daily pass: a dormant user's series must not gap just because they never
 *  opened the app (prd.md R-16.2). */
export async function usersMissingDailyPoint(date: string): Promise<string[]> {
  const rows = await db()
    .select({ id: users.id })
    .from(users)
    .where(
      sql`NOT EXISTS (SELECT 1 FROM ${netWorthDaily} WHERE ${netWorthDaily.userId} = ${users.id} AND ${netWorthDaily.date} = ${date})`,
    );
  return rows.map((r) => r.id);
}
