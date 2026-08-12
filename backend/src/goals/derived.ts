// Layer 0: the derived financial substrate (docs/prd-app-v2.md §3.2).
//
// Every goal, guardrail and ladder rung reads from this. It is deliberately a pure
// function of a transaction list plus a cash balance, so it can be tested without a
// database and so the same computation can be replayed over historical data.
//
// The governing rule throughout: **null means "we do not know", and null is never
// treated as zero.** A user with two weeks of transaction history has an unknown
// income volatility, not a volatility of 0. Conflating those would hand them a
// 3-month emergency fund target derived from nothing.

import { isEssential, isIncome, isNonSpend } from './categories.js';

/** Minimum distinct months of income before volatility means anything. Below this
 *  the standard deviation is dominated by how the window happens to align with pay
 *  dates rather than by real variability. */
export const MIN_MONTHS_FOR_VOLATILITY = 3;

/** Minimum observed span before a monthly spending rate is meaningful. A shorter
 *  sample is dominated by whether rent happened to land inside the window. */
export const MIN_DAYS_FOR_MONTHLY_RATE = 30;

export type DerivedInputTransaction = {
  amount: string;
  date: string; // YYYY-MM-DD
  category: string | null;
};

export type DerivedState = {
  takeHomeMonthly: number | null;
  incomeVolatility: number | null;
  essentialMonthly: number | null;
  discretionaryMonthly: number | null;
  liquidCash: number | null;
  runwayMonths: number | null;
  savingsRate: number | null;
};

function monthKey(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

function daysBefore(now: Date, days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return (((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2) as number;
}

/** Coefficient of variation: stdev / mean. Scale-free, so someone earning $3k a
 *  month and someone earning $30k are comparable. Population stdev, not sample:
 *  we have the whole window, not a sample of it. */
function coefficientOfVariation(values: number[]): number | null {
  if (values.length < MIN_MONTHS_FOR_VOLATILITY) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return null;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/** Monthly income totals, most recent month last. Months with no income at all are
 *  included as zero ONLY between months that do have income, so a gap in the middle
 *  of the window counts as variability while an empty leading month (before the
 *  user's history starts) does not. */
function monthlyIncomeSeries(txs: DerivedInputTransaction[], months: number, now: Date): number[] {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffKey = monthKey(cutoff.toISOString().slice(0, 10));

  const byMonth = new Map<string, number>();
  for (const tx of txs) {
    const key = monthKey(tx.date);
    if (key < cutoffKey) continue;
    const amount = parseFloat(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!isIncome(tx.category)) continue;
    byMonth.set(key, (byMonth.get(key) ?? 0) + amount);
  }
  if (byMonth.size === 0) return [];

  const keys = [...byMonth.keys()].sort();
  const first = keys[0] as string;
  const last = keys[keys.length - 1] as string;

  // Fill interior gaps with zero: a month where the user earned nothing is real
  // variability and must not be silently dropped.
  const series: number[] = [];
  const cursor = new Date(`${first}-01T00:00:00Z`);
  const end = new Date(`${last}-01T00:00:00Z`);
  while (cursor <= end) {
    series.push(byMonth.get(cursor.toISOString().slice(0, 7)) ?? 0);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return series;
}

/** Mean monthly outflow over a trailing window, split by whether the category is
 *  essential. Transfers are excluded from both: moving money is not spending it. */
function monthlyOutflows(
  txs: DerivedInputTransaction[],
  windowDays: number,
  now: Date,
): { essential: number; discretionary: number; hasData: boolean } {
  const cutoff = daysBefore(now, windowDays);
  let essential = 0;
  let discretionary = 0;
  let earliest: string | null = null;
  // Any transaction older than the cutoff proves the user's history spans the whole
  // window, even though that transaction is not itself counted. Without this the
  // denominator would be the span of transactions INSIDE the window, so a user with
  // a year of history whose oldest in-window transaction is 68 days old would be
  // treated as having 68 days of history and their monthly rate inflated.
  let historyPredatesWindow = false;

  for (const tx of txs) {
    if (tx.date < cutoff) {
      historyPredatesWindow = true;
      continue;
    }
    const amount = parseFloat(tx.amount);
    if (!Number.isFinite(amount) || amount >= 0) continue;
    if (isNonSpend(tx.category)) continue;
    if (earliest === null || tx.date < earliest) earliest = tx.date;
    const abs = Math.abs(amount);
    if (isEssential(tx.category)) essential += abs;
    else discretionary += abs;
  }

  if (earliest === null) return { essential: 0, discretionary: 0, hasData: false };

  // Divide by the span actually OBSERVED, never by the nominal window.
  //
  // This previously divided by `windowDays / 30`, a constant 3, so a user with two
  // weeks of history had a fortnight of spending averaged across three months and
  // came out roughly 6x too low. That is not a cosmetic error: essentialMonthly is
  // the denominator of runwayMonths and the multiplicand of the rung 4 emergency
  // fund target, so an understated value hands the user a target they have already
  // met, and ladder rungs never un-complete. A wrong rung is permanent.
  const observedDays = historyPredatesWindow
    ? windowDays
    : Math.min(
        windowDays,
        Math.max(1, Math.round((now.getTime() - new Date(`${earliest}T00:00:00Z`).getTime()) / 86_400_000) + 1),
      );

  // Below this, a monthly rate extrapolated from the sample says more about which
  // days happened to fall in the window than about the user. Unknown, not zero.
  if (observedDays < MIN_DAYS_FOR_MONTHLY_RATE) {
    return { essential: 0, discretionary: 0, hasData: false };
  }

  const months = observedDays / 30;
  return { essential: essential / months, discretionary: discretionary / months, hasData: true };
}

/**
 * Savings rate for one calendar month, as a fraction.
 *
 * Deliberately NOT `computeDerivedState` over a single month: that function
 * normalises outflow over a 90-day window, so handing it one month's data divides
 * spend by three and reports a wildly optimistic rate. Anything evaluating a single
 * month (rung 6's sustained-rate streak, monthly guardrails) must use this.
 *
 * Returns null when the month has no income, since a rate against zero income is
 * meaningless rather than zero.
 */
export function monthlySavingsRate(txs: DerivedInputTransaction[], month: string): number | null {
  let income = 0;
  let outflow = 0;

  for (const tx of txs) {
    if (tx.date.slice(0, 7) !== month) continue;
    const amount = parseFloat(tx.amount);
    if (!Number.isFinite(amount)) continue;
    if (isNonSpend(tx.category)) continue;
    if (amount > 0 && isIncome(tx.category)) income += amount;
    else if (amount < 0) outflow += Math.abs(amount);
  }

  if (income <= 0) return null;
  return Math.max(0, Math.min(1, (income - outflow) / income));
}

/**
 * Compute the whole Layer 0 substrate.
 *
 * `now` is injected rather than read from the clock so results are deterministic
 * and testable, and so the same computation can be replayed over history.
 */
export function computeDerivedState(
  txs: DerivedInputTransaction[],
  liquidCash: number | null,
  now: Date,
): DerivedState {
  // Take-home uses a MEDIAN of the trailing 6 months, not a mean, so a single
  // bonus or a one-off contract payment does not permanently raise the target the
  // user is measured against.
  const sixMonth = monthlyIncomeSeries(txs, 6, now);
  const takeHomeMonthly = median(sixMonth);

  const twelveMonth = monthlyIncomeSeries(txs, 12, now);
  const incomeVolatility = coefficientOfVariation(twelveMonth);

  const { essential, discretionary, hasData } = monthlyOutflows(txs, 90, now);
  const essentialMonthly = hasData ? essential : null;
  const discretionaryMonthly = hasData ? discretionary : null;

  const runwayMonths =
    liquidCash !== null && essentialMonthly !== null && essentialMonthly > 0 ? liquidCash / essentialMonthly : null;

  // Savings rate is a FRACTION here (0 to 1), unlike the percentage integer that
  // getSpendingSummary returns for display. The ladder and the guardrails compare
  // against fractions, so keeping display formatting out of the substrate avoids a
  // whole class of by-100 errors.
  let savingsRate: number | null = null;
  if (takeHomeMonthly !== null && takeHomeMonthly > 0 && essentialMonthly !== null && discretionaryMonthly !== null) {
    const outflow = essentialMonthly + discretionaryMonthly;
    savingsRate = Math.max(0, Math.min(1, (takeHomeMonthly - outflow) / takeHomeMonthly));
  }

  return {
    takeHomeMonthly,
    incomeVolatility,
    essentialMonthly,
    discretionaryMonthly,
    liquidCash,
    runwayMonths,
    savingsRate,
  };
}
