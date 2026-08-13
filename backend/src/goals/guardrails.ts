// Layer 3: habit guardrails and streaks (docs/prd.md R-7.11, R-7.12).
//
// Everything here is a pure function of transactions, cached liabilities, and
// prior period rows, with an injected clock, so the whole set is testable
// without a database.
//
// Two rules govern every evaluator:
//
//   1. A guardrail must NEVER fail a user because we lack data. Where a data
//      source genuinely does not exist yet (statement close days, per-debt
//      payment mapping), the guardrail evaluates to `indeterminate` and says
//      why. Failing someone for our missing plumbing is the single worst
//      outcome this module can produce.
//
//   2. Streaks are weekly or monthly, NEVER daily (R-7.12). Money has no daily
//      resolution; a daily streak on a finance app is a lie that will break.

import { isEssential, isIncome, isNonSpend } from './categories.js';
import { monthlySavingsRate } from './derived.js';

export type GuardrailPeriodKind = 'week' | 'month';

export type GuardrailKey =
  | 'savings_rate_floor'
  | 'discretionary_cap'
  | 'bills_on_time'
  | 'utilization_before_close'
  | 'contribution_streak'
  | 'no_new_recurring'
  | 'debt_principal_paid';

/** Period outcomes. `passed` / `missed` are final; `indeterminate` (we lacked
 *  the data to judge) and `not_applicable` (nothing to measure for this user)
 *  are re-evaluated on later refreshes in case the data arrives. */
export type GuardrailOutcome = 'passed' | 'missed' | 'indeterminate' | 'not_applicable';

export type GuardrailDefinition = {
  key: GuardrailKey;
  period: GuardrailPeriodKind;
  label: string;
  /** Set when no honest data source exists yet; such guardrails always
   *  evaluate indeterminate and the API surfaces this string. */
  unavailableReason: string | null;
};

/** The launch set, verbatim from the R-7.11 table. */
export const GUARDRAILS: GuardrailDefinition[] = [
  { key: 'savings_rate_floor', period: 'month', label: 'Savings rate floor', unavailableReason: null },
  { key: 'discretionary_cap', period: 'week', label: 'Discretionary cap', unavailableReason: null },
  { key: 'bills_on_time', period: 'month', label: 'Bills on time', unavailableReason: null },
  {
    key: 'utilization_before_close',
    period: 'month',
    label: 'Utilization before close',
    unavailableReason:
      'Needs per-card statement close days and credit limits, which no provider supplies yet (R-7.17).',
  },
  { key: 'contribution_streak', period: 'week', label: 'Contribution streak', unavailableReason: null },
  { key: 'no_new_recurring', period: 'month', label: 'No new recurring', unavailableReason: null },
  {
    key: 'debt_principal_paid',
    period: 'month',
    label: 'Debt principal paid',
    unavailableReason: 'Needs payments matched to individual debts, which requires the debt_accounts merge (R-7.13).',
  },
];

/** Starting savings-rate floor: 15% (R-7.11). */
export const SAVINGS_FLOOR_START = 0.15;
/** Floor increase per achieved quarter: 2 percentage points (R-7.11). */
export const SAVINGS_FLOOR_STEP = 0.02;
/** Discretionary cap: trailing 8-week median minus 10% (R-7.11). */
export const DISCRETIONARY_LOOKBACK_WEEKS = 8;
export const DISCRETIONARY_CAP_DISCOUNT = 0.1;
/** History required before "no new recurring" can distinguish a new
 *  subscription from an old one that only just became detectable. */
export const RECURRING_MIN_HISTORY_DAYS = 90;

// --- Period arithmetic (all UTC) --------------------------------------------

export type Period = {
  /** Inclusive start date, YYYY-MM-DD. */
  start: string;
  /** Inclusive end date, YYYY-MM-DD. */
  end: string;
};

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcDate(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00Z`);
}

function addDays(isoDay: string, days: number): string {
  const d = utcDate(isoDay);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Monday-start week (ISO convention) containing `at`, in UTC. */
export function weekOf(at: Date): Period {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const dow = d.getUTCDay(); // 0 = Sunday
  const sinceMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  const start = iso(d);
  return { start, end: addDays(start, 6) };
}

/** Calendar month containing `at`, in UTC. */
export function monthOf(at: Date): Period {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0));
  return { start: iso(start), end: iso(end) };
}

/** The `count` most recent fully closed periods before `now`, oldest first. */
export function closedPeriods(kind: GuardrailPeriodKind, now: Date, count: number): Period[] {
  const periods: Period[] = [];
  let cursor = kind === 'week' ? weekOf(now) : monthOf(now);
  for (let i = 0; i < count; i++) {
    const prevEnd = addDays(cursor.start, -1);
    cursor = kind === 'week' ? weekOf(utcDate(prevEnd)) : monthOf(utcDate(prevEnd));
    periods.unshift(cursor);
  }
  return periods;
}

// --- Evaluation inputs ------------------------------------------------------

export type GuardrailTransaction = {
  date: string; // YYYY-MM-DD
  amount: number;
  category: string | null;
  merchantName: string | null;
  accountId: string;
};

export type LiabilityDueState = {
  nextDueDate: string | null;
  isOverdue: boolean | null;
};

export type GuardrailContext = {
  /** All of one user's transactions inside the evaluation horizon. */
  transactions: GuardrailTransaction[];
  /** Earliest transaction date across the user's whole history, or null. */
  earliestTransactionDate: string | null;
  liabilities: LiabilityDueState[];
  /** Funding accounts of the user's active goals. */
  goalFundingAccountIds: string[];
  /** Cap for the savings-rate floor: the active rung's target (rung 6). */
  surplusTargetRate: number;
  /** Fully passed quarters of the savings floor so far: floor(passes / 3). */
  achievedSavingsQuarters: number;
};

export type GuardrailEvaluation = {
  outcome: GuardrailOutcome;
  targetValue: number | null;
  actualValue: number | null;
};

const indeterminate = (): GuardrailEvaluation => ({ outcome: 'indeterminate', targetValue: null, actualValue: null });

function inPeriod(date: string, period: Period): boolean {
  return date >= period.start && date <= period.end;
}

/** Savings rate floor (month). Consumes the Layer 0 FRACTION
 *  (monthlySavingsRate, derived.ts), never the display percentage that
 *  getSpendingSummary returns. The two are deliberately distinct numbers; the
 *  display one is an integer 0 to 100 and comparing it against a 0.15 floor
 *  would pass everyone forever. */
function evaluateSavingsRateFloor(period: Period, ctx: GuardrailContext): GuardrailEvaluation {
  const target = Math.min(
    SAVINGS_FLOOR_START + SAVINGS_FLOOR_STEP * ctx.achievedSavingsQuarters,
    ctx.surplusTargetRate,
  );
  const txs = ctx.transactions.map((t) => ({ amount: String(t.amount), date: t.date, category: t.category }));
  const rate = monthlySavingsRate(txs, period.start.slice(0, 7));
  // Null means the month had no recorded income: unknown, never a fail.
  if (rate === null) return { outcome: 'indeterminate', targetValue: target, actualValue: null };
  return { outcome: rate >= target ? 'passed' : 'missed', targetValue: target, actualValue: rate };
}

function isDiscretionary(tx: GuardrailTransaction): boolean {
  if (tx.amount >= 0) return false;
  if (tx.category === null) return false;
  if (isNonSpend(tx.category) || isEssential(tx.category) || isIncome(tx.category)) return false;
  return true;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** Discretionary cap (week): trailing 8-week median minus 10%, top
 *  discretionary category only (R-7.11). */
function evaluateDiscretionaryCap(period: Period, ctx: GuardrailContext): GuardrailEvaluation {
  const lookbackStart = addDays(period.start, -7 * DISCRETIONARY_LOOKBACK_WEEKS);
  // Without a full 8 weeks of observed history the median is noise: unknown.
  if (ctx.earliestTransactionDate === null || ctx.earliestTransactionDate > lookbackStart) return indeterminate();

  // Top discretionary category over the 8 weeks immediately before the period.
  const byCategory = new Map<string, number>();
  for (const tx of ctx.transactions) {
    if (!isDiscretionary(tx)) continue;
    if (tx.date < lookbackStart || tx.date >= period.start) continue;
    const cat = tx.category as string;
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(tx.amount));
  }
  if (byCategory.size === 0) {
    // No discretionary spending observed at all: nothing to cap.
    return { outcome: 'not_applicable', targetValue: null, actualValue: null };
  }
  let topCategory = '';
  let topTotal = -1;
  for (const [cat, total] of byCategory) {
    if (total > topTotal) {
      topCategory = cat;
      topTotal = total;
    }
  }

  // Weekly totals for that category across the 8 lookback weeks (zero weeks
  // included: a quiet week is real data, not a gap).
  const weekly: number[] = [];
  for (let w = 0; w < DISCRETIONARY_LOOKBACK_WEEKS; w++) {
    const start = addDays(lookbackStart, w * 7);
    const end = addDays(start, 6);
    let total = 0;
    for (const tx of ctx.transactions) {
      if (!isDiscretionary(tx) || tx.category !== topCategory) continue;
      if (tx.date < start || tx.date > end) continue;
      total += Math.abs(tx.amount);
    }
    weekly.push(total);
  }
  const target = median(weekly) * (1 - DISCRETIONARY_CAP_DISCOUNT);

  let actual = 0;
  for (const tx of ctx.transactions) {
    if (!isDiscretionary(tx) || tx.category !== topCategory) continue;
    if (!inPeriod(tx.date, period)) continue;
    actual += Math.abs(tx.amount);
  }

  return { outcome: actual <= target ? 'passed' : 'missed', targetValue: target, actualValue: actual };
}

/** Bills on time (month): every account with a nextDueDate paid before it,
 *  from plaid_liability_cache (R-7.11).
 *
 *  The cache carries a current `isOverdue` flag, not a per-month payment
 *  history, so this is a point-in-time reading taken just after the month
 *  closed. An affirmative overdue flag is real data and fails the period; an
 *  absent flag on any account means we cannot verify it and the period is
 *  indeterminate, never a fail. */
function evaluateBillsOnTime(_period: Period, ctx: GuardrailContext): GuardrailEvaluation {
  const withDue = ctx.liabilities.filter((l) => l.nextDueDate !== null);
  if (withDue.length === 0) return indeterminate();

  const overdueCount = withDue.filter((l) => l.isOverdue === true).length;
  if (overdueCount > 0) {
    return { outcome: 'missed', targetValue: 0, actualValue: overdueCount };
  }
  if (withDue.some((l) => l.isOverdue === null)) return indeterminate();
  return { outcome: 'passed', targetValue: 0, actualValue: 0 };
}

/** Contribution streak (week): at least one net positive transfer to any goal
 *  funding account (R-7.11). */
function evaluateContributionStreak(period: Period, ctx: GuardrailContext): GuardrailEvaluation {
  if (ctx.goalFundingAccountIds.length === 0) {
    // No goal has a funding account: nothing to measure for this user.
    return { outcome: 'not_applicable', targetValue: null, actualValue: null };
  }
  // No transaction history covering the week means we cannot see transfers.
  if (ctx.earliestTransactionDate === null || ctx.earliestTransactionDate > period.end) return indeterminate();

  const accounts = new Set(ctx.goalFundingAccountIds);
  let net = 0;
  for (const tx of ctx.transactions) {
    if (!accounts.has(tx.accountId)) continue;
    if (!inPeriod(tx.date, period)) continue;
    net += tx.amount;
  }
  return { outcome: net > 0 ? 'passed' : 'missed', targetValue: 0, actualValue: net };
}

/** Minimal re-implementation of the subscription grouping for "did a NEW
 *  recurring merchant appear", diffed across two horizons so a long-standing
 *  subscription that only just crossed the detection threshold is present in
 *  both sets and never counted as new. Mirrors subscriptions/detect.ts
 *  (3+ occurrences, monthly cadence, consistent amount). */
function recurringMerchants(txs: GuardrailTransaction[], upTo: string): Set<string> {
  const groups = new Map<string, GuardrailTransaction[]>();
  for (const tx of txs) {
    if (tx.amount >= 0 || tx.merchantName === null || tx.date > upTo) continue;
    const key = tx.merchantName.toLowerCase().trim();
    const group = groups.get(key);
    if (group) group.push(tx);
    else groups.set(key, [tx]);
  }

  const detected = new Set<string>();
  for (const [key, group] of groups) {
    if (group.length < 3) continue;
    const amounts = group.map((t) => Math.abs(t.amount));
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    if (min === 0 || (max - min) / min > 0.1) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const ms = utcDate((sorted[i] as GuardrailTransaction).date).getTime();
      const prev = utcDate((sorted[i - 1] as GuardrailTransaction).date).getTime();
      gaps.push(Math.round((ms - prev) / 86_400_000));
    }
    const cadence = Math.round(median(gaps));
    if (cadence < 25 || cadence > 35) continue;
    detected.add(key);
  }
  return detected;
}

/** No new recurring (month): no new subscription detected (R-7.11). */
function evaluateNoNewRecurring(period: Period, ctx: GuardrailContext): GuardrailEvaluation {
  // Below ~90 days of history before the month, every old subscription is
  // still becoming detectable and would read as "new". Unknown, not a fail.
  if (
    ctx.earliestTransactionDate === null ||
    ctx.earliestTransactionDate > addDays(period.start, -RECURRING_MIN_HISTORY_DAYS)
  ) {
    return indeterminate();
  }

  const before = recurringMerchants(ctx.transactions, addDays(period.start, -1));
  const after = recurringMerchants(ctx.transactions, period.end);
  let newCount = 0;
  for (const merchant of after) {
    if (!before.has(merchant)) newCount++;
  }
  return { outcome: newCount === 0 ? 'passed' : 'missed', targetValue: 0, actualValue: newCount };
}

/** Evaluate one guardrail for one closed period. */
export function evaluateGuardrail(key: GuardrailKey, period: Period, ctx: GuardrailContext): GuardrailEvaluation {
  switch (key) {
    case 'savings_rate_floor':
      return evaluateSavingsRateFloor(period, ctx);
    case 'discretionary_cap':
      return evaluateDiscretionaryCap(period, ctx);
    case 'bills_on_time':
      return evaluateBillsOnTime(period, ctx);
    case 'contribution_streak':
      return evaluateContributionStreak(period, ctx);
    case 'no_new_recurring':
      return evaluateNoNewRecurring(period, ctx);
    // No honest data source exists yet for these two; see GUARDRAILS for the
    // reasons. Indeterminate, NEVER missed: failing a user for plumbing we
    // have not built is the worst outcome this module can produce.
    case 'utilization_before_close':
    case 'debt_principal_paid':
      return indeterminate();
  }
}

// --- Streaks and repair tokens (R-7.12) -------------------------------------

/** Two repair tokens banked to start; one more earned per 3 completed periods;
 *  bank capped at 2. */
export const REPAIR_TOKENS_START = 2;
export const REPAIR_TOKENS_CAP = 2;
export const PERIODS_PER_EARNED_TOKEN = 3;

export type StoredPeriodOutcome = {
  outcome: string;
  repairUsed: boolean;
};

export type StreakState = {
  /** Consecutive completed periods, where a repaired miss preserves (but does
   *  not extend) the run. */
  streak: number;
  /** Repair tokens currently banked. */
  repairTokens: number;
  /** Total passed periods ever, feeding the savings-floor quarter count. */
  totalPassed: number;
};

/** Replay a guardrail's period history, oldest first, to derive its streak and
 *  token bank. Derived rather than stored so a corrected period outcome can
 *  never leave a counter wrong (the same reasoning as the goal_periods schema
 *  comment).
 *
 *  Rules, from R-7.12:
 *  - a passed period extends the streak and counts toward earning;
 *  - every PERIODS_PER_EARNED_TOKEN passed periods banks one token, capped at
 *    REPAIR_TOKENS_CAP (earning while full is forfeited);
 *  - a missed period with a repair spends a token and preserves the streak;
 *  - a missed period without one resets the streak counter and does NOTHING
 *    else: no stage loss, no pet distress, no push;
 *  - indeterminate and not_applicable periods neither break nor extend. */
export function replayStreak(history: StoredPeriodOutcome[]): StreakState {
  let streak = 0;
  let tokens = REPAIR_TOKENS_START;
  let totalPassed = 0;

  for (const period of history) {
    if (period.outcome === 'passed') {
      streak++;
      totalPassed++;
      if (totalPassed % PERIODS_PER_EARNED_TOKEN === 0) tokens = Math.min(REPAIR_TOKENS_CAP, tokens + 1);
      continue;
    }
    if (period.outcome === 'missed') {
      if (period.repairUsed) {
        tokens = Math.max(0, tokens - 1);
      } else {
        streak = 0;
      }
    }
    // indeterminate / not_applicable / anything else: neutral.
  }

  return { streak, repairTokens: tokens, totalPassed };
}
