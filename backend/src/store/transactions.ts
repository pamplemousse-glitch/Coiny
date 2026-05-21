import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import type { Transaction } from '../types/transaction.js';

export type StoredTransaction = typeof transactions.$inferSelect;

export async function persistTransactions(userId: string, txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return;
  const rows = txs.map((tx) => ({
    transactionId: tx.id,
    userId,
    accountId: tx.account_id,
    merchantName: tx.details?.counterparty?.name ?? null,
    amount: tx.amount,
    date: tx.date,
    category: tx.details?.category ?? null,
  }));
  await db().insert(transactions).values(rows).onConflictDoNothing();
}

export async function getRecentOutflows(userId: string, days: number): Promise<StoredTransaction[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db()
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.date} >= ${cutoffStr} AND CAST(${transactions.amount} AS NUMERIC) < 0`,
      ),
    );
  return rows;
}
