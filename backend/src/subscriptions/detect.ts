// Subscription detection — pure function over a list of transactions.
// Algorithm:
// 1. Group by lowercased merchant_name + rounded amount band (within 5%).
// 2. Require ≥3 occurrences in the input window.
// 3. Compute median day-gap between consecutive transactions; if it falls
//    inside MIN_DAYS..MAX_DAYS, classify as a subscription with that cadence.
// 4. Amount consistency: max/min within AMOUNT_TOLERANCE_PCT.
//
// Returns one record per detected subscription.

import type { StoredTransaction } from '../store/transactions.js';

export type Subscription = {
  merchantName: string;
  cadenceDays: number; // median gap (rounded)
  amount: number; // absolute, dollars
  count: number;
  lastDate: string; // YYYY-MM-DD
};

export const MIN_OCCURRENCES = 3;
export const MIN_CADENCE_DAYS = 25;
export const MAX_CADENCE_DAYS = 35;
export const AMOUNT_TOLERANCE_PCT = 0.1;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function detectSubscriptions(txs: StoredTransaction[]): Subscription[] {
  // Group by lowercased merchant name. Merchant null → skip (can't dedupe).
  const groups = new Map<string, StoredTransaction[]>();
  for (const tx of txs) {
    if (!tx.merchantName) continue;
    const key = tx.merchantName.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const subs: Subscription[] = [];

  for (const [merchantKey, group] of groups) {
    if (group.length < MIN_OCCURRENCES) continue;

    const amounts = group.map((tx) => Math.abs(parseFloat(tx.amount)));
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    if (minAmt === 0) continue;
    if ((maxAmt - minAmt) / minAmt > AMOUNT_TOLERANCE_PCT) continue;

    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1]!.date, sorted[i]!.date));
    }
    const cadence = Math.round(median(gaps));
    if (cadence < MIN_CADENCE_DAYS || cadence > MAX_CADENCE_DAYS) continue;

    const original = sorted[0]!.merchantName!;
    subs.push({
      merchantName: original,
      cadenceDays: cadence,
      amount: amounts.reduce((s, a) => s + a, 0) / amounts.length,
      count: group.length,
      lastDate: sorted[sorted.length - 1]!.date,
    });
  }

  return subs.sort((a, b) => b.amount - a.amount);
}
