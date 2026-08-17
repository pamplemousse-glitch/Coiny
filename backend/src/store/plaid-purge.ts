// Disposal of Plaid-derived data when a user disconnects their bank.
//
// Open decision B7, settled: disconnect deletes immediately rather than
// keeping the data for a 90-day grace window. Simplest to build, simplest to
// state in a privacy policy, and it needs no `disconnected_at` column, which
// the unlink path could not have provided anyway since it deletes the item row
// outright. If the user relinks, the history is re-pulled from Plaid.
//
// Until this existed, `DELETE /api/plaid/item` removed the `plaid_items` row
// and nothing else. Transactions, recurring streams, liabilities and balances
// all reference `user_id` or `account_id`, never `item_id`, so none of them
// cascaded: a user who disconnected their bank kept every transaction Coiny
// had ever pulled, indefinitely, with no record that the item was ever gone.
//
// Scoped to the user, not to one item, because the endpoint is: it unlinks
// every item the user has. If a per-item disconnect is ever added, this needs
// to narrow via `plaid_account_balances.item_id`, which is the only table that
// maps an item to its accounts.

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  assetClassCache,
  investmentTransactions,
  plaidAccountBalances,
  plaidLiabilityCache,
  plaidRecurringStreams,
  transactions,
} from '../db/schema.js';

/** The asset classes whose values come from Plaid and nowhere else. */
const PLAID_ASSET_CLASSES = ['bank', 'investments'];

export type PlaidPurgeCounts = {
  transactions: number;
  investmentTransactions: number;
  recurringStreams: number;
  liabilities: number;
  accountBalances: number;
  assetClasses: number;
};

/**
 * Delete every row Plaid produced for this user.
 *
 * Deliberately does NOT touch `category_overrides`. Those are keyed by
 * merchant and are the user's own categorisation work, not Plaid's data;
 * deleting them would silently discard something the user typed and would make
 * a relink worse than a first link.
 */
export async function deletePlaidDataForUser(userId: string): Promise<PlaidPurgeCounts> {
  const counts: PlaidPurgeCounts = {
    transactions: 0,
    investmentTransactions: 0,
    recurringStreams: 0,
    liabilities: 0,
    accountBalances: 0,
    assetClasses: 0,
  };

  const deleted = await db().delete(transactions).where(eq(transactions.userId, userId)).returning({
    id: transactions.transactionId,
  });
  counts.transactions = deleted.length;

  const investments = await db()
    .delete(investmentTransactions)
    .where(eq(investmentTransactions.userId, userId))
    .returning({ id: investmentTransactions.userId });
  counts.investmentTransactions = investments.length;

  const streams = await db()
    .delete(plaidRecurringStreams)
    .where(eq(plaidRecurringStreams.userId, userId))
    .returning({ id: plaidRecurringStreams.streamId });
  counts.recurringStreams = streams.length;

  const liabilities = await db()
    .delete(plaidLiabilityCache)
    .where(eq(plaidLiabilityCache.userId, userId))
    .returning({ id: plaidLiabilityCache.accountId });
  counts.liabilities = liabilities.length;

  const balances = await db()
    .delete(plaidAccountBalances)
    .where(eq(plaidAccountBalances.userId, userId))
    .returning({ id: plaidAccountBalances.accountId });
  counts.accountBalances = balances.length;

  // Without this the balances are gone and net worth still reports the last
  // cached bank and investment totals, so an unlinked account keeps showing a
  // number. The read path answers from this cache, not from the raw tables.
  const classes = await db()
    .delete(assetClassCache)
    .where(and(eq(assetClassCache.userId, userId), inArray(assetClassCache.assetClass, PLAID_ASSET_CLASSES)))
    .returning({ id: assetClassCache.assetClass });
  counts.assetClasses = classes.length;

  return counts;
}
