import { and, eq, isNotNull, sql } from 'drizzle-orm';
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

// Returns total debit spend per category for the rolling 7-day window ending today.
// Call BEFORE persisting the current transaction batch so the snapshot excludes it.
export async function getWeeklySpendByCategory(userId: string): Promise<Record<string, number>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db()
    .select({
      category: transactions.category,
      total: sql<string>`SUM(ABS(CAST(${transactions.amount} AS NUMERIC)))`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNotNull(transactions.category),
        sql`${transactions.date} >= ${cutoffStr}`,
        sql`CAST(${transactions.amount} AS NUMERIC) < 0`,
      ),
    )
    .groupBy(transactions.category);

  const result: Record<string, number> = {};
  for (const row of rows) {
    if (row.category) result[row.category] = parseFloat(row.total ?? '0');
  }
  return result;
}

export interface SpendingSummary {
  monthlySpend: number;
  monthlyIncome: number;
  savingsRate: number | null;
}

// 30-day income vs spend from the transactions table.
// Inflows < $50 are excluded as petty transfers; outflows are all negative amounts.
// savingsRate is null when there is no recorded income.
export async function getSpendingSummary(userId: string): Promise<SpendingSummary> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db()
    .select({ amount: sql<string>`CAST(${transactions.amount} AS TEXT)` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), sql`${transactions.date} >= ${cutoffStr}`));

  let monthlySpend = 0;
  let monthlyIncome = 0;
  for (const row of rows) {
    const amount = parseFloat(row.amount ?? '0');
    if (amount < 0) {
      monthlySpend += Math.abs(amount);
    } else if (amount >= 50) {
      monthlyIncome += amount;
    }
  }

  const savingsRate =
    monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((1 - monthlySpend / monthlyIncome) * 100))) : null;

  return { monthlySpend, monthlyIncome, savingsRate };
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
