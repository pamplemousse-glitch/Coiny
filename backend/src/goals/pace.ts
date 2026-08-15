// Layer 2: target-goal pace computation (docs/prd.md R-7.8).
//
// Pure function of a goal row, the funding account's balance and transactions,
// and an injected clock, following the shape of ladder.ts so the whole thing is
// testable without a database.
//
// The governing rule, stated in R-7.8 because it is the failure mode the spec
// expects: **null means "we do not know" and is never coerced to zero.**
// A goal with no target date has a null pace, not an "Off pace" one. A funding
// account with ten days of history has a null pace, not a zero run rate. The
// UI renders "too early to say" for null, and that copy is only honest if the
// number underneath really is unknown rather than invented.

/** Average calendar month in days. Used for both months-remaining and the
 *  run-rate normalisation so the two sides of `pace` share one month length. */
export const DAYS_PER_MONTH = 30.4375;

/** Floor for fractional months remaining (R-7.8). A past or imminent target
 *  date clamps here instead of producing a zero or negative divisor. */
export const MIN_MONTHS_REMAINING = 0.25;

/** Trailing window for the actual contribution run rate (R-7.8). */
export const CONTRIBUTION_WINDOW_DAYS = 90;

/** Below this many days of history on the funding account, a run rate says more
 *  about which days happened to be observed than about the user. Null, not zero. */
export const MIN_CONTRIBUTION_HISTORY_DAYS = 30;

export type PaceBand = 'ahead' | 'on_pace' | 'behind' | 'off_pace';

export type GapAction = { type: 'add_monthly'; amountUsd: number } | { type: 'push_date'; weeks: number };

/** A funding-account transaction. Positive amounts are money into the account,
 *  negative amounts are money out, matching the stored transaction convention. */
export type ContributionTransaction = {
  date: string; // YYYY-MM-DD
  amount: number;
};

export type GoalPaceInput = {
  targetAmountUsd: number;
  /** Null is a legitimate state: the goal renders contribution history only. */
  targetDate: string | null; // YYYY-MM-DD
  /** Goal creation date, the start of the contributions-since-created sum. */
  createdAt: string; // YYYY-MM-DD or ISO timestamp
  countsExistingBalance: boolean;
  /** Live balance of the funding account, or null when unknown. Unknown is not
   *  zero: a balance-counting goal without a balance has an unknown `current`. */
  fundingBalanceUsd: number | null;
  /** Transactions on the funding account. May span more than the 90-day window;
   *  older rows only prove history depth and are not counted. */
  fundingTransactions: ContributionTransaction[];
  /** Earliest transaction date ever seen on the funding account, or null when
   *  the account has no transaction history at all. Passed separately so the
   *  caller can bound the transaction fetch without losing history depth. */
  earliestTransactionDate: string | null;
};

export type GoalPace = {
  /** Progress toward the target in USD, or null when unknowable. */
  currentAmountUsd: number | null;
  /** Fractional months to the target date, floored at MIN_MONTHS_REMAINING.
   *  Null while the goal has no target date. */
  monthsRemaining: number | null;
  /** (target - current) / monthsRemaining, floored at 0. Null while the target
   *  date or the current amount is unknown. */
  requiredRunRateUsd: number | null;
  /** Trailing 90-day mean net contribution per month. Null below
   *  MIN_CONTRIBUTION_HISTORY_DAYS of account history. */
  actualRunRateUsd: number | null;
  /** Days of contribution history observed on the funding account. */
  contributionHistoryDays: number | null;
  /** actual / required. Null whenever either side is null, and null when the
   *  goal is already fully funded (required run rate of zero). */
  pace: number | null;
  paceBand: PaceBand | null;
  /** Current amount has met the target. */
  achieved: boolean;
  /** The single smallest change that returns the goal to on-pace (R-7.8).
   *  Null unless the band is behind or off_pace. */
  gapAction: GapAction | null;
};

function dayDiff(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((to.getTime() - from) / 86_400_000);
}

function isoDaysBefore(now: Date, days: number): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function paceBandFor(pace: number): PaceBand {
  if (pace > 1.1) return 'ahead';
  if (pace >= 0.9) return 'on_pace';
  if (pace >= 0.5) return 'behind';
  return 'off_pace';
}

/** Trailing 90-day mean net contribution to the funding account, per month.
 *
 *  Normalised over the span actually observed, mirroring derived.ts: an account
 *  whose history starts 40 days ago has its 40 days of net flow scaled to a
 *  month, not diluted across a window it never saw. Below
 *  MIN_CONTRIBUTION_HISTORY_DAYS the rate is null, never zero (R-7.8). */
export function actualRunRate(
  txs: ContributionTransaction[],
  earliestTransactionDate: string | null,
  now: Date,
): { rate: number | null; historyDays: number | null } {
  if (earliestTransactionDate === null) return { rate: null, historyDays: null };

  const historyDays = Math.max(0, dayDiff(earliestTransactionDate, now));
  if (historyDays < MIN_CONTRIBUTION_HISTORY_DAYS) return { rate: null, historyDays };

  const cutoff = isoDaysBefore(now, CONTRIBUTION_WINDOW_DAYS);
  let net = 0;
  for (const tx of txs) {
    if (tx.date < cutoff) continue;
    if (!Number.isFinite(tx.amount)) continue;
    net += tx.amount;
  }

  const observedDays = Math.min(CONTRIBUTION_WINDOW_DAYS, historyDays);
  return { rate: net / (observedDays / DAYS_PER_MONTH), historyDays };
}

/** Net contributions to the funding account since the goal was created, floored
 *  at zero. The `current` basis for goals that opt out of counting the existing
 *  balance. */
function contributionsSinceCreated(txs: ContributionTransaction[], createdAt: string): number {
  const since = createdAt.slice(0, 10);
  let net = 0;
  for (const tx of txs) {
    if (tx.date < since) continue;
    if (!Number.isFinite(tx.amount)) continue;
    net += tx.amount;
  }
  return Math.max(0, net);
}

/** The single smallest change that returns the goal to on-pace, expressed as
 *  one number (R-7.8): either extra dollars per month, or weeks of date slip.
 *
 *  The spec does not define "smallest" across the two incommensurable units, so
 *  the choice here is the option with the smaller RELATIVE disruption: the
 *  fractional increase in monthly contribution versus the fractional extension
 *  of the timeline. When nothing is currently flowing to the goal, pushing the
 *  date can never help, so the answer is always dollars. */
function computeGapAction(
  targetAmountUsd: number,
  currentAmountUsd: number,
  monthsRemaining: number,
  requiredRunRateUsd: number,
  actualRunRateUsd: number,
): GapAction {
  const addMonthlyUsd = Math.max(1, Math.ceil(0.9 * requiredRunRateUsd - actualRunRateUsd));
  if (actualRunRateUsd <= 0) return { type: 'add_monthly', amountUsd: addMonthlyUsd };

  const monthsNeeded = (0.9 * (targetAmountUsd - currentAmountUsd)) / actualRunRateUsd;
  const pushMonths = monthsNeeded - monthsRemaining;
  const pushWeeks = Math.max(1, Math.ceil((pushMonths * DAYS_PER_MONTH) / 7));

  const dollarRelative = addMonthlyUsd / Math.max(actualRunRateUsd, 1);
  const dateRelative = pushMonths / monthsRemaining;
  if (dateRelative < dollarRelative) return { type: 'push_date', weeks: pushWeeks };
  return { type: 'add_monthly', amountUsd: addMonthlyUsd };
}

/** Compute the full R-7.8 pace block for one goal. `now` is injected so the
 *  result is deterministic and the same computation can replay history. */
export function computeGoalPace(input: GoalPaceInput, now: Date): GoalPace {
  const { rate, historyDays } = actualRunRate(input.fundingTransactions, input.earliestTransactionDate, now);

  // `current` is unknowable in two situations, and both stay null: a
  // balance-counting goal whose balance we could not read, and a
  // contributions-only goal with no funding account history to sum.
  let currentAmountUsd: number | null;
  if (input.countsExistingBalance) {
    currentAmountUsd = input.fundingBalanceUsd;
  } else {
    currentAmountUsd =
      input.earliestTransactionDate === null
        ? null
        : contributionsSinceCreated(input.fundingTransactions, input.createdAt);
  }

  const achieved = currentAmountUsd !== null && currentAmountUsd >= input.targetAmountUsd;

  // R-7.8: while target_date is null, requiredRunRate and pace are null and the
  // goal renders contribution history only. NOT zero, NOT off_pace.
  let monthsRemaining: number | null = null;
  let requiredRunRateUsd: number | null = null;
  if (input.targetDate !== null) {
    monthsRemaining = Math.max(MIN_MONTHS_REMAINING, -dayDiff(input.targetDate, now) / DAYS_PER_MONTH);
    if (currentAmountUsd !== null) {
      requiredRunRateUsd = Math.max(0, (input.targetAmountUsd - currentAmountUsd) / monthsRemaining);
    }
  }

  let pace: number | null = null;
  let paceBand: PaceBand | null = null;
  if (requiredRunRateUsd !== null && requiredRunRateUsd > 0 && rate !== null) {
    pace = rate / requiredRunRateUsd;
    paceBand = paceBandFor(pace);
  } else if (achieved) {
    // Fully funded: nothing left to pace against, and "Off pace" would be a lie.
    paceBand = 'ahead';
  }

  let gapAction: GapAction | null = null;
  if (
    pace !== null &&
    (paceBand === 'behind' || paceBand === 'off_pace') &&
    currentAmountUsd !== null &&
    monthsRemaining !== null &&
    requiredRunRateUsd !== null &&
    rate !== null
  ) {
    gapAction = computeGapAction(input.targetAmountUsd, currentAmountUsd, monthsRemaining, requiredRunRateUsd, rate);
  }

  return {
    currentAmountUsd,
    monthsRemaining,
    requiredRunRateUsd,
    actualRunRateUsd: rate,
    contributionHistoryDays: historyDays,
    pace,
    paceBand,
    achieved,
    gapAction,
  };
}
