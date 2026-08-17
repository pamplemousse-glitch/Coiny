// Recurring charges and income, from Plaid's `/transactions/recurring/get`.
//
// Replaces a hand-rolled detector that grouped transactions by merchant and
// looked for a 25-35 day gap. That detector could only ever find MONTHLY
// charges, which meant annual subscriptions -- the ones people actually forget
// they are paying -- were invisible by construction. It also duplicated a
// classification Plaid already performs better: Plaid sees inflows, reports a
// real cadence, and tombstones a stream when it stops, none of which a gap
// heuristic over our own stored transactions can do.
//
// The streams were already being fetched, encrypted and stored. Nothing read
// them, so the app was holding merchant PII with no consumer while showing the
// user a worse answer computed somewhere else.

import type { StoredStream } from '../store/plaid-recurring.js';

export type RecurringItem = {
  id: string;
  /** Merchant when Plaid identified one, otherwise the raw description. */
  name: string;
  /** Plaid's cadence, verbatim. `UNKNOWN` is possible and is not guessed at. */
  frequency: string;
  /** The real amount per occurrence, absolute dollars. */
  amount: number;
  /**
   * `amount` restated as dollars per month, so cadences can be compared and
   * summed. Null when the cadence is UNKNOWN: a made-up number in a spending
   * total is worse than an absent one.
   */
  monthlyAmount: number | null;
  lastDate: string | null;
};

export type RecurringSummary = {
  outflow: RecurringItem[];
  inflow: RecurringItem[];
  /** Sum of `monthlyAmount` across outflows. Excludes UNKNOWN cadences. */
  monthlyOutflowTotal: number;
  monthlyInflowTotal: number;
  /**
   * How many streams were left out of the totals because Plaid could not name
   * a cadence. Surfaced rather than hidden: a total that silently omits rows
   * is the same class of defect as a balance that silently omits an account.
   */
  excludedFromTotals: number;
};

/**
 * Occurrences per month for each cadence Plaid reports.
 *
 * Weekly and biweekly are 52/12 and 26/12, not 4 and 2. A "monthly" figure
 * built on 4 weeks understates a weekly charge by about 8%, which is the kind
 * of quiet error that makes a spending total untrustworthy.
 */
const MONTHLY_FACTOR: Record<string, number> = {
  WEEKLY: 52 / 12,
  BIWEEKLY: 26 / 12,
  SEMI_MONTHLY: 2,
  MONTHLY: 1,
  ANNUALLY: 1 / 12,
};

export function monthlyFactor(frequency: string): number | null {
  return MONTHLY_FACTOR[frequency.toUpperCase()] ?? null;
}

function amountOf(stream: StoredStream): number {
  // Average over last: a stream whose most recent charge was a partial month
  // or a promotional rate would otherwise misreport the ongoing cost.
  const raw = stream.averageAmount ?? stream.lastAmount;
  const parsed = raw == null ? Number.NaN : Math.abs(parseFloat(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toRecurringItem(stream: StoredStream): RecurringItem {
  const amount = amountOf(stream);
  const factor = monthlyFactor(stream.frequency);
  return {
    id: stream.streamId,
    // Plaid leaves merchant_name null on plenty of streams; the description is
    // the raw bank memo and is always present, so it is the fallback rather
    // than showing a blank row.
    name: stream.merchantName ?? stream.description,
    frequency: stream.frequency,
    amount,
    monthlyAmount: factor == null ? null : amount * factor,
    lastDate: stream.lastDate,
  };
}

function sortByCost(items: RecurringItem[]): RecurringItem[] {
  // Biggest monthly commitment first: that is the order someone auditing their
  // spending wants. UNKNOWN cadences sort last rather than as zero.
  return [...items].sort((a, b) => (b.monthlyAmount ?? -1) - (a.monthlyAmount ?? -1));
}

function total(items: RecurringItem[]): number {
  return items.reduce((sum, item) => sum + (item.monthlyAmount ?? 0), 0);
}

/**
 * Build the response from stored streams.
 *
 * Only active streams are included. Plaid tombstones a stream when it stops,
 * and `upsertRecurringStreams` maps that to `is_active = false`, so a
 * cancelled subscription drops off rather than lingering as a charge the user
 * no longer has.
 */
export function summarize(streams: { inflow: StoredStream[]; outflow: StoredStream[] }): RecurringSummary {
  const outflow = sortByCost(streams.outflow.filter((s) => s.isActive).map(toRecurringItem));
  const inflow = sortByCost(streams.inflow.filter((s) => s.isActive).map(toRecurringItem));

  return {
    outflow,
    inflow,
    monthlyOutflowTotal: total(outflow),
    monthlyInflowTotal: total(inflow),
    excludedFromTotals: [...outflow, ...inflow].filter((i) => i.monthlyAmount == null).length,
  };
}
