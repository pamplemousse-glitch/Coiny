import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { investmentTransactions } from '../db/schema.js';
import type { PlaidInvestmentTransaction } from '../plaid/types.js';

/** Subtypes that represent money ARRIVING in the investment account from
 *  outside it: the thing goal pacing calls a contribution.
 *
 *  `buy` is deliberately absent. Buying a fund with cash already inside the
 *  brokerage moves money sideways, not in, and counting it would make a
 *  rebalance look like saving. */
export const CONTRIBUTION_SUBTYPES: ReadonlySet<string> = new Set(['contribution', 'deposit', 'transfer']);

/** Persists a page of Plaid investment transactions for one user.
 *
 *  The amount is NEGATED here, once, at the boundary. Plaid's investment
 *  convention is positive when cash is debited; Coiny stores negative for
 *  outflow (types/transaction.ts, and plaid/adapter.ts:133 does the same for
 *  bank transactions). Doing it anywhere else would leave two conventions alive
 *  in the same column and make every contribution read as a withdrawal. */
export async function upsertInvestmentTransactions(userId: string, txs: PlaidInvestmentTransaction[]): Promise<number> {
  if (txs.length === 0) return 0;

  const rows = txs
    .filter((tx) => Number.isFinite(tx.amount))
    .map((tx) => ({
      investmentTransactionId: tx.investment_transaction_id,
      userId,
      accountId: tx.account_id,
      securityId: tx.security_id ?? null,
      date: tx.date,
      amount: (-tx.amount).toFixed(2),
      type: tx.type,
      subtype: tx.subtype,
    }));

  if (rows.length === 0) return 0;

  await db()
    .insert(investmentTransactions)
    .values(rows)
    // Plaid may restate a transaction (a pending trade settling, a correction),
    // and the same id must not create a second row that double-counts.
    .onConflictDoUpdate({
      target: investmentTransactions.investmentTransactionId,
      set: {
        amount: sql`excluded.amount`,
        date: sql`excluded.date`,
        type: sql`excluded.type`,
        subtype: sql`excluded.subtype`,
        securityId: sql`excluded.security_id`,
      },
    });

  return rows.length;
}

export type InvestmentActivityRow = { date: string; amount: number };

/** Contribution-shaped investment activity on one account inside a window.
 *
 *  Scoped by userId, so an account id copied from another user reads empty
 *  (.claude/rules/security.md #6). */
export async function getInvestmentContributions(
  userId: string,
  accountId: string,
  sinceDate: string,
): Promise<InvestmentActivityRow[]> {
  const rows = await db()
    .select({ date: investmentTransactions.date, amount: investmentTransactions.amount })
    .from(investmentTransactions)
    .where(
      and(
        eq(investmentTransactions.userId, userId),
        eq(investmentTransactions.accountId, accountId),
        gte(investmentTransactions.date, sinceDate),
      ),
    );

  return rows
    .map((r) => ({ date: r.date, amount: Number.parseFloat(r.amount) }))
    .filter((r) => Number.isFinite(r.amount));
}

/** Earliest investment transaction ever recorded on an account, or null.
 *  Used to tell a quiet account from a young one, the same distinction
 *  getFundingActivity already makes for bank transactions. */
export async function getEarliestInvestmentDate(userId: string, accountId: string): Promise<string | null> {
  const [row] = await db()
    .select({ min: sql<string | null>`MIN(${investmentTransactions.date})` })
    .from(investmentTransactions)
    .where(and(eq(investmentTransactions.userId, userId), eq(investmentTransactions.accountId, accountId)));
  return row?.min ?? null;
}
