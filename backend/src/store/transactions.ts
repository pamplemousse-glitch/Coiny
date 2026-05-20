import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import type { Transaction } from '../types/transaction.js';

export type StoredTransaction = typeof transactions.$inferSelect;

// Insert transactions from a sync batch. onConflictDoNothing handles
// idempotency — if we re-process a webhook, existing rows stay.
export async function persistTransactions(txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return;
  const rows = txs.map((tx) => ({
    transactionId: tx.id,
    accountId: tx.account_id,
    merchantName: tx.details?.counterparty?.name ?? null,
    amount: tx.amount,
    date: tx.date,
    category: tx.details?.category ?? null,
  }));
  await db().insert(transactions).values(rows).onConflictDoNothing();
}

// Pull transactions from the last `days` for subscription detection.
// Filters to outflows only (subscriptions are debits).
export async function getRecentOutflows(days: number): Promise<StoredTransaction[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db()
    .select()
    .from(transactions)
    .where(sql`${transactions.date} >= ${cutoffStr} AND CAST(${transactions.amount} AS NUMERIC) < 0`);
  return rows;
}
