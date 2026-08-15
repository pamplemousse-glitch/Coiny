// Orchestration for target-goal pace (R-7.8) and guardrail period evaluation
// (R-7.11, R-7.12): loads inputs, calls the pure modules (pace.ts,
// guardrails.ts), persists results. Runs inside refreshGoalSystem
// (goals/refresh.ts), which is the scheduler seam: when the nightly job lands
// it calls that one function and this evaluation comes with it. Nothing here
// may assume it is running inside a request.

import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import { reactionForEvent } from '../reactions/contract.js';
import { performReactions, type ReactionCandidate } from '../reactions/perform.js';
import { getCachedLiabilities } from '../store/plaid-liabilities.js';
import {
  getFundingActivity,
  listGoalPeriods,
  listUnarchivedGoals,
  markGoalAchieved,
  resetRecurringGoal,
  type StoredGoalPeriod,
  saveGoalPace,
  upsertGoalPeriod,
} from '../store/target-goals.js';
import { decryptNullable } from '../util/crypto.js';
import {
  closedPeriods,
  evaluateGuardrail,
  GUARDRAILS,
  type GuardrailContext,
  type GuardrailDefinition,
  type GuardrailTransaction,
  PERIODS_PER_EARNED_TOKEN,
  replayStreak,
  type StreakState,
} from './guardrails.js';
import { SURPLUS_SAVINGS_RATE } from './ladder.js';
import { computeGoalPace } from './pace.js';

/** Transaction lookback for guardrail evaluation. The widest consumer is
 *  "no new recurring", which needs 120 days of detection data before a period
 *  plus the period itself; 240 covers every guardrail with slack. */
const GUARDRAIL_WINDOW_DAYS = 240;

/** Funding-account lookback for pace: the 90-day contribution window plus
 *  enough slack for the contributions-since-created sum of a young goal. */
const PACE_WINDOW_DAYS = 120;

/** How many recent closed periods are (re)evaluated per refresh. Missed and
 *  passed outcomes are final; indeterminate ones inside this horizon get
 *  another chance as data arrives. */
const WEEKLY_BACKFILL = 4;
const MONTHLY_BACKFILL = 2;

/** A reaction is only fired for a period that closed recently. The `direct`
 *  class is defined as "the user's own action in the last 7 days" (section
 *  7.6); a month-old period settling on a dormant user's return is history,
 *  not news, and reacting to it would read as scolding the absence. */
const REACTION_RECENCY_DAYS = 7;

export type GoalEvaluationInputs = {
  /** Live balance per account id, for balance-counting goals. Null when the
   *  caller had no balance read; those goals then report a null pace rather
   *  than a zero-based one. */
  accountBalances: Record<string, number> | null;
  /** The user's rung 6 target, the cap for the savings-rate floor. Null means
   *  the engine default. */
  surplusTargetRate: number | null;
};

// --- Pace ------------------------------------------------------------------

async function refreshGoalPaces(userId: string, inputs: GoalEvaluationInputs, now: Date): Promise<ReactionCandidate[]> {
  const goals = await listUnarchivedGoals(userId);
  const today = now.toISOString().slice(0, 10);
  const candidates: ReactionCandidate[] = [];

  for (const goal of goals) {
    const activity = goal.fundingAccountId
      ? await getFundingActivity(userId, goal.fundingAccountId, now, PACE_WINDOW_DAYS)
      : { transactions: [], earliestTransactionDate: null };

    const fundingBalanceUsd =
      goal.fundingAccountId !== null && inputs.accountBalances
        ? (inputs.accountBalances[goal.fundingAccountId] ?? null)
        : null;

    const pace = computeGoalPace(
      {
        targetAmountUsd: goal.targetAmountUsd,
        targetDate: goal.targetDate,
        createdAt: goal.createdAt,
        countsExistingBalance: goal.countsExistingBalance,
        fundingBalanceUsd,
        fundingTransactions: activity.transactions,
        earliestTransactionDate: activity.earliestTransactionDate,
      },
      now,
    );
    await saveGoalPace(userId, goal.id, pace, now);

    if (pace.achieved && goal.achievedAt === null) {
      await markGoalAchieved(userId, goal.id, now);
      // goal_achieved (R-7.24): celebrate, allowed to push. Fired on the
      // null-to-achieved edge only, so re-refreshes stay silent. The reason
      // carries no goal name: names are user text and the event label is enough.
      candidates.push({ name: 'goal_achieved', reaction: reactionForEvent('goal_achieved') });
    }

    // Sinking-fund reset (R-7.7): once an achieved recurring-annual goal's date
    // has passed, roll the date forward a year and start over.
    if (goal.recurringAnnual && goal.targetDate !== null && goal.targetDate < today) {
      const achieved = pace.achieved || goal.achievedAt !== null;
      if (achieved) {
        const monthDay = goal.targetDate.slice(4);
        // A Feb 29 due date lands on Feb 28 the following year.
        const next = `${String(Number(goal.targetDate.slice(0, 4)) + 1)}${monthDay === '-02-29' ? '-02-28' : monthDay}`;
        await resetRecurringGoal(userId, goal.id, next);
      }
    }
  }
  return candidates;
}

// --- Guardrail periods -----------------------------------------------------

async function loadGuardrailTransactions(
  userId: string,
  now: Date,
): Promise<{ txs: GuardrailTransaction[]; earliest: string | null }> {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - GUARDRAIL_WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const [rows, [earliest]] = await Promise.all([
    db()
      .select({
        date: transactions.date,
        amount: transactions.amount,
        category: transactions.category,
        merchantName: transactions.merchantName,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, cutoffStr))),
    db()
      .select({ min: sql<string | null>`MIN(${transactions.date})` })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
  ]);

  const txs: GuardrailTransaction[] = [];
  for (const row of rows) {
    const amount = parseFloat(row.amount);
    if (!Number.isFinite(amount)) continue;
    txs.push({
      date: row.date,
      amount,
      category: row.category,
      // Encrypted at rest (0048); guardrail subscription matching needs the
      // plaintext merchant. Tolerant of pre-0048 plaintext rows.
      merchantName: decryptNullable(row.merchantName),
      accountId: row.accountId,
    });
  }
  return { txs, earliest: earliest?.min ?? null };
}

function isFinal(outcome: string): boolean {
  return outcome === 'passed' || outcome === 'missed';
}

async function evaluateGuardrailPeriods(
  userId: string,
  inputs: GoalEvaluationInputs,
  now: Date,
): Promise<ReactionCandidate[]> {
  const reactionCandidates: ReactionCandidate[] = [];
  const [{ txs, earliest }, liabilityRows, activeGoals, storedPeriods] = await Promise.all([
    loadGuardrailTransactions(userId, now),
    getCachedLiabilities(userId),
    listUnarchivedGoals(userId),
    listGoalPeriods(userId),
  ]);

  const liabilities = liabilityRows.map((l) => ({ nextDueDate: l.nextDueDate, isOverdue: l.isOverdue }));
  const goalFundingAccountIds = [
    ...new Set(activeGoals.flatMap((g) => (g.fundingAccountId ? [g.fundingAccountId] : []))),
  ];
  const surplusTargetRate = inputs.surplusTargetRate ?? SURPLUS_SAVINGS_RATE;

  // In-memory copy of each guardrail's history, kept sorted by periodStart, so
  // repair decisions and the savings-floor quarter count see rows written
  // earlier in this same run.
  const historyByKey = new Map<string, StoredGoalPeriod[]>();
  for (const def of GUARDRAILS) {
    historyByKey.set(
      def.key,
      storedPeriods.filter((p) => p.guardrailKey === def.key),
    );
  }

  for (const def of GUARDRAILS) {
    const history = historyByKey.get(def.key) as StoredGoalPeriod[];
    const candidates = closedPeriods(def.period, now, def.period === 'week' ? WEEKLY_BACKFILL : MONTHLY_BACKFILL);

    for (const period of candidates) {
      const existing = history.find((p) => p.periodStart === period.start);
      if (existing && isFinal(existing.outcome)) continue;

      const prior = history.filter((p) => p.periodStart < period.start);
      const priorState = replayStreak(prior);

      const ctx: GuardrailContext = {
        transactions: txs,
        earliestTransactionDate: earliest,
        liabilities,
        goalFundingAccountIds,
        surplusTargetRate,
        achievedSavingsQuarters:
          def.key === 'savings_rate_floor' ? Math.floor(priorState.totalPassed / PERIODS_PER_EARNED_TOKEN) : 0,
      };

      const result = evaluateGuardrail(def.key, period, ctx);

      // R-7.12: a repair token is spent automatically when a miss would break a
      // live streak. Spending one on a streak of zero would be waste, and the
      // user never has to remember to redeem anything.
      const repairUsed = result.outcome === 'missed' && priorState.repairTokens > 0 && priorState.streak > 0;

      await upsertGoalPeriod(
        userId,
        def.key,
        period,
        result.outcome,
        result.targetValue,
        result.actualValue,
        repairUsed,
        now,
      );

      // R-7.24: guardrail outcomes now move the creature, but only when the
      // period just closed (see REACTION_RECENCY_DAYS) and only on the settle
      // edge (finals are skipped above, so reaching here IS the transition).
      //   passed          -> goal_period_passed (happy; digest push only)
      //   missed+repair   -> silent: the token did its job, nothing to mourn
      //   missed          -> goal_period_missed (neutral, never a push), plus
      //                      streak_broken when a live streak just ended,
      //                      which per R-7.12 changes nothing else
      const periodEndMs = new Date(`${period.end}T00:00:00Z`).getTime();
      const recent = now.getTime() - periodEndMs <= REACTION_RECENCY_DAYS * 86_400_000;
      if (recent && result.outcome === 'passed') {
        reactionCandidates.push({
          name: 'goal_period_passed',
          reaction: reactionForEvent('goal_period_passed', `goal_period_passed (${def.key})`),
        });
      }
      if (recent && result.outcome === 'missed' && !repairUsed) {
        reactionCandidates.push({
          name: 'goal_period_missed',
          reaction: reactionForEvent('goal_period_missed', `goal_period_missed (${def.key})`),
        });
        if (priorState.streak > 0) {
          reactionCandidates.push({
            name: 'streak_broken',
            reaction: reactionForEvent('streak_broken', `streak_broken (${def.key})`),
          });
        }
      }

      const updated: StoredGoalPeriod = {
        guardrailKey: def.key,
        periodStart: period.start,
        periodEnd: period.end,
        outcome: result.outcome,
        targetValue: result.targetValue,
        actualValue: result.actualValue,
        repairUsed,
        evaluatedAt: now.toISOString(),
      };
      const idx = history.findIndex((p) => p.periodStart === period.start);
      if (idx >= 0) history[idx] = updated;
      else {
        history.push(updated);
        history.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
      }
    }
  }
  return reactionCandidates;
}

/** One full goal-system evaluation pass for one user: pace for every
 *  unarchived goal, then guardrail periods and streak accounting. Idempotent:
 *  pace upserts per goal, periods upsert on (user, guardrail, start), and
 *  final outcomes are never overwritten. */
export async function evaluateGoalSystem(userId: string, inputs: GoalEvaluationInputs, now: Date): Promise<void> {
  const paceCandidates = await refreshGoalPaces(userId, inputs, now);
  const guardrailCandidates = await evaluateGuardrailPeriods(userId, inputs, now);

  // One candidate set for the whole pass, one performed reaction: the creature
  // has one body, and a week where three guardrails settled at once is still
  // one moment. The rest land in analytics as precedence-suppressed. Reaction
  // failure must never fail the evaluation pass, so this is best-effort.
  const candidates = [...paceCandidates, ...guardrailCandidates];
  if (candidates.length > 0) {
    try {
      await performReactions(userId, candidates, now);
    } catch (err) {
      console.warn('goal system reaction failed:', err);
    }
  }
}

// --- Read-side presentation -------------------------------------------------

export type GuardrailView = {
  key: GuardrailDefinition['key'];
  label: string;
  period: GuardrailDefinition['period'];
  /** Why this guardrail cannot be judged yet, when no source exists. */
  unavailableReason: string | null;
  streak: StreakState['streak'];
  repairTokens: StreakState['repairTokens'];
  latest: {
    periodStart: string;
    periodEnd: string;
    outcome: string;
    targetValue: number | null;
    actualValue: number | null;
    repairUsed: boolean;
  } | null;
};

/** Assemble the client-facing guardrail list from stored periods. Streaks and
 *  token banks are derived by replay, never stored, so a corrected outcome can
 *  never leave a counter wrong. */
export async function guardrailViews(userId: string): Promise<GuardrailView[]> {
  const periods = await listGoalPeriods(userId);
  return GUARDRAILS.map((def) => {
    const history = periods.filter((p) => p.guardrailKey === def.key);
    const state = replayStreak(history);
    const last = history[history.length - 1] ?? null;
    return {
      key: def.key,
      label: def.label,
      period: def.period,
      unavailableReason: def.unavailableReason,
      streak: state.streak,
      repairTokens: state.repairTokens,
      latest: last
        ? {
            periodStart: last.periodStart,
            periodEnd: last.periodEnd,
            outcome: last.outcome,
            targetValue: last.targetValue,
            actualValue: last.actualValue,
            repairUsed: last.repairUsed,
          }
        : null,
    };
  });
}
