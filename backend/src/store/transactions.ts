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

// Updates existing transaction rows for pending→posted flips and amount corrections.
// Uses onConflictDoUpdate so that rows already stored get their mutable fields refreshed.
export async function upsertModifiedTransactions(userId: string, txs: Transaction[]): Promise<void> {
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
  await db()
    .insert(transactions)
    .values(rows)
    .onConflictDoUpdate({
      target: transactions.transactionId,
      set: {
        amount: sql`excluded.amount`,
        date: sql`excluded.date`,
        merchantName: sql`excluded.merchant_name`,
        category: sql`excluded.category`,
      },
    });
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
  spendByCategory: Record<string, number>;
}

// Categories that represent genuine income. Everything else that arrives as a
// credit (refunds, transfers between the user's own accounts, credit card
// payments, reimbursements) is NOT income and must never inflate the savings
// rate. See INCOME_CATEGORIES usage in getSpendingSummary.
const INCOME_CATEGORIES = new Set(['paycheck', 'income']);

// Outflow categories that move money without consuming it. Excluded from spend
// so that paying a credit card or moving cash to savings does not register as
// spending on top of the original purchase.
const NON_SPEND_CATEGORIES = new Set(['transfer']);

// 30-day income vs spend from the transactions table.
// Income counts only credits categorised as actual income; a positive amount
// alone is not sufficient, since refunds and self-transfers are also positive.
// savingsRate is null when there is no recorded income.
export async function getSpendingSummary(userId: string): Promise<SpendingSummary> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db()
    .select({
      amount: sql<string>`CAST(${transactions.amount} AS TEXT)`,
      category: transactions.category,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), sql`${transactions.date} >= ${cutoffStr}`));

  let monthlySpend = 0;
  let monthlyIncome = 0;
  const spendByCategory: Record<string, number> = {};

  for (const row of rows) {
    const amount = parseFloat(row.amount ?? '0');
    const category = row.category ?? null;

    if (amount < 0) {
      if (category !== null && NON_SPEND_CATEGORIES.has(category)) continue;
      const abs = Math.abs(amount);
      monthlySpend += abs;
      if (category) {
        spendByCategory[category] = (spendByCategory[category] ?? 0) + abs;
      }
    } else if (category !== null && INCOME_CATEGORIES.has(category)) {
      monthlyIncome += amount;
    }
  }

  const savingsRate =
    monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((1 - monthlySpend / monthlyIncome) * 100))) : null;

  return { monthlySpend, monthlyIncome, savingsRate, spendByCategory };
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
