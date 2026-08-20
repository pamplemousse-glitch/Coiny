// The financial snapshot: the Plaid and Spinwheel assembly that used to live
// inline in GET /api/net-worth, extracted so the goal-system refresh and the
// net-worth endpoint read the SAME numbers rather than two drifting copies.
//
// Behaviour is preserved from the original inline code: each source fails soft
// (a user with no bank linked gets an empty snapshot, not an error), and the
// distinction between "loaded and zero" and "not loaded" is kept explicit so
// callers can honour the null-means-unknown rule (docs/prd.md R-7.3).

import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { spinwheelConnections } from '../db/schema.js';
import { countsAsLiquidCash } from '../networth/account-taxonomy.js';
import { accountsBalanceGet, investmentsHoldingsGet, liabilitiesGet } from '../plaid/client.js';
import type { PlaidHolding, PlaidSecurity } from '../plaid/types.js';
import { getDebtProfile, type SpinwheelDebt } from '../spinwheel/client.js';
import { getItemsByUser } from '../store/items.js';
import { getCachedLiabilities } from '../store/plaid-liabilities.js';
import { HIGH_APR_THRESHOLD } from './ladder.js';

export type BankAccountSummary = {
  accountId: string;
  name: string;
  type: string;
  /** Plaid's precise account subtype (`401k`, `hsa`, `cash isa`, `cd`, ...).
   *  Null for accounts Plaid could not classify. See networth/account-taxonomy.ts. */
  subtype: string | null;
  balance: number;
  minPayment: number | null;
  nextDueDate: string | null;
  isOverdue: boolean | null;
  primaryApr: number | null;
};

export type HoldingSummary = {
  securityId: string;
  name: string | null;
  ticker: string | null;
  value: number;
  /**
   * Plaid's security type: `equity`, `etf`, `mutual fund`, `fixed income`,
   * `cash`, `derivative`, `cryptocurrency`, ... Without it a bond fund, an
   * uninvested cash sweep and a stock are the same row to the client.
   *
   * Optional, not `| null`: these summaries are cached as a JSON payload
   * (`asset_cache.payload`), so a payload written before this field existed
   * decodes with the key absent rather than null. Declaring it required would
   * be a type that lies about what is actually in the database.
   */
  securityType?: string | null;
  /**
   * Plaid's `subtype`, finer than `securityType`: 'money market', 'option',
   * 'etf'. Optional for the same cached-payload reason as `securityType`.
   */
  securitySubtype?: string | null;
  /** True when Plaid classes this security as cash rather than an investment.
   *  See PlaidSecurity.is_cash_equivalent for why it is not the same question
   *  as the account subtype #274 handled. */
  isCashEquivalent?: boolean | null;
  /**
   * The unvested portion of an equity grant, in dollars, excluded from
   * `value`. Zero or absent on ordinary holdings.
   *
   * Kept alongside rather than silently dropped: "you have $180,000 of stock"
   * and "you have $60,000 of stock and $120,000 you do not own yet" are
   * different facts, and only one of them is money. The client can show the
   * unvested figure as context without it ever reaching the total.
   */
  unvestedValue?: number | null;
  /**
   * Which account holds it. Plaid returns this on every holding and we dropped
   * it, so there was no way to say "this ETF is inside your Roth IRA" even
   * after account subtypes landed (networth/account-taxonomy.ts). Same
   * optionality reasoning as above.
   */
  accountId?: string | null;
};

export type SyncedAccountBalances = {
  itemId: string;
  accounts: Array<{ accountId: string; name: string; type: string; subtype: string | null; balance: number | null }>;
};

export type PlaidSnapshot = {
  /** Sum of depository balances. Credit/loan balances are NOT subtracted here;
   *  the caller reconciles against Spinwheel to avoid double-counting. */
  bankTotal: number;
  /** Credit and loan balances visible through Plaid, accumulated separately. */
  plaidDebtTotal: number;
  /** Sum of POSITIVE depository balances, the ladder's liquid-cash basis. */
  liquidDeposits: number;
  investmentsTotal: number;
  bankAccounts: BankAccountSummary[];
  investmentHoldings: HoldingSummary[];
  /** True when the user has at least one Plaid item (rung 0's condition). */
  hasConnectedAccount: boolean;
  /** True when at least one balance call succeeded, so `liquidDeposits` is a
   *  measurement. False means unknown, which must never be read as zero. */
  balancesLoaded: boolean;
  /** Raw per-item account balances from the successful calls, so the refresh
   *  path can persist them to the per-account cache (prd.md R-16.4). */
  syncedAccounts: SyncedAccountBalances[];
  /** True only when EVERY item's holdings call succeeded. A partial success
   *  must not be persisted as the investments total: it would undercount. */
  allHoldingsSucceeded: boolean;
  /** First rejection reason from the balance calls, null when none failed.
   *  Lets the refresh path record an honest error class instead of silence. */
  balanceFailure: unknown;
  /** First rejection reason from the holdings calls, null when none failed. */
  holdingsFailure: unknown;
};

function emptyPlaidSnapshot(): PlaidSnapshot {
  return {
    bankTotal: 0,
    plaidDebtTotal: 0,
    liquidDeposits: 0,
    investmentsTotal: 0,
    bankAccounts: [],
    investmentHoldings: [],
    hasConnectedAccount: false,
    balancesLoaded: false,
    syncedAccounts: [],
    allHoldingsSucceeded: false,
    balanceFailure: null,
    holdingsFailure: null,
  };
}

type LiabilityMeta = {
  minPayment: number | null;
  nextDueDate: string | null;
  isOverdue: boolean | null;
  primaryApr: number | null;
};

/**
 * Turns one `/investments/holdings/get` response into summaries plus a total.
 *
 * Extracted because this ran in TWO places — here and networth/refresh.ts —
 * assembling the same cached payload from the same inputs. The comment above
 * HoldingSummary says the type was extracted to stop those two drifting; the
 * LOGIC had not been, so a rule added in one was silently absent from the
 * other. Vesting is exactly the kind of rule that must not be half-applied.
 *
 * THE COUNTED VALUE is `vested_value` when Plaid supplies one, and
 * `institution_value` otherwise. Plaid returns `vested_value` only for
 * equity-compensation holdings, so ordinary shares are unaffected: their
 * `institution_value` already is entirely the user's.
 */
export function summariseHoldings(
  holdings: PlaidHolding[],
  securities: PlaidSecurity[],
): {
  holdings: HoldingSummary[];
  total: number;
  cashEquivalentTotal: number;
  unvestedTotal: number;
  /** OLDEST institution pricing time across the holdings, or null when none
   *  carried one. Oldest rather than newest because a class is only as fresh
   *  as its stalest contributor, which is the rule rollupRows already uses. */
  oldestPricedAt: Date | null;
} {
  const secMap = new Map(securities.map((s) => [s.security_id, s]));
  const summaries: HoldingSummary[] = [];
  let total = 0;
  let cashEquivalentTotal = 0;
  let unvestedTotal = 0;
  let oldestPricedAt: Date | null = null;

  for (const h of holdings) {
    const marketValue = h.institution_value ?? 0;
    // `?? null` rather than a falsy check: a genuinely fully-unvested grant has
    // vested_value 0, and 0 is a real answer meaning "none of this is yours".
    // Treating it as absent would count the whole grant.
    const vested = h.vested_value ?? null;
    const value = vested ?? marketValue;
    const unvested = vested === null ? 0 : Math.max(0, marketValue - vested);

    total += value;
    unvestedTotal += unvested;

    // Datetime first: it is the same instant with more precision than the
    // date-only field. An unparseable value is ignored rather than guessed at.
    const pricedRaw = h.institution_price_datetime ?? h.institution_price_as_of ?? null;
    if (pricedRaw !== null) {
      const priced = new Date(pricedRaw);
      if (!Number.isNaN(priced.getTime()) && (oldestPricedAt === null || priced < oldestPricedAt)) {
        oldestPricedAt = priced;
      }
    }

    const sec = secMap.get(h.security_id);
    if (sec?.is_cash_equivalent) cashEquivalentTotal += value;

    summaries.push({
      securityId: h.security_id,
      name: sec?.name ?? null,
      ticker: sec?.ticker_symbol ?? null,
      value,
      securityType: sec?.type ?? null,
      securitySubtype: sec?.subtype ?? null,
      isCashEquivalent: sec?.is_cash_equivalent ?? null,
      unvestedValue: unvested,
      accountId: h.account_id ?? null,
    });
  }

  return { holdings: summaries, total, cashEquivalentTotal, unvestedTotal, oldestPricedAt };
}

export async function fetchPlaidSnapshot(userId: string): Promise<PlaidSnapshot> {
  try {
    const items = await getItemsByUser(userId);
    if (items.length === 0) return emptyPlaidSnapshot();

    // Fetch balances and investment holdings in parallel; liabilities read from cache.
    const [balanceResults, holdingsResults] = await Promise.all([
      Promise.allSettled(items.map((item) => accountsBalanceGet(item.accessToken))),
      Promise.allSettled(items.map((item) => investmentsHoldingsGet(item.accessToken))),
    ]);

    // Build liability payment metadata map from cache; fall back to live API if cache is empty.
    const liabilityMeta = new Map<string, LiabilityMeta>();
    const cachedRows = await getCachedLiabilities(userId);
    if (cachedRows.length > 0) {
      for (const row of cachedRows) {
        liabilityMeta.set(row.accountId, {
          minPayment: row.minPayment != null ? parseFloat(row.minPayment) : null,
          nextDueDate: row.nextDueDate ?? null,
          isOverdue: row.isOverdue ?? null,
          primaryApr: row.primaryApr != null ? parseFloat(row.primaryApr) : null,
        });
      }
    } else {
      // Cache empty. Fall back to live Plaid calls.
      const liabilityResults = await Promise.allSettled(items.map((item) => liabilitiesGet(item.accessToken)));
      for (const res of liabilityResults) {
        if (res.status === 'rejected') continue;
        for (const c of res.value.liabilities.credit ?? []) {
          const purchaseApr = c.aprs?.find((a) => a.apr_type === 'purchase_apr') ?? c.aprs?.[0] ?? null;
          liabilityMeta.set(c.account_id, {
            minPayment: c.minimum_payment_amount,
            nextDueDate: c.next_payment_due_date,
            isOverdue: c.is_overdue ?? null,
            primaryApr: purchaseApr?.apr_percentage ?? null,
          });
        }
        for (const m of res.value.liabilities.mortgage ?? []) {
          liabilityMeta.set(m.account_id, {
            minPayment: m.next_monthly_payment,
            nextDueDate: m.next_payment_due_date,
            isOverdue: null,
            primaryApr: null,
          });
        }
        for (const s of res.value.liabilities.student ?? []) {
          liabilityMeta.set(s.account_id, {
            minPayment: s.minimum_payment_amount,
            nextDueDate: s.next_payment_due_date,
            isOverdue: null,
            primaryApr: null,
          });
        }
      }
    }

    let bankTotal = 0;
    let plaidDebtTotal = 0;
    let liquidDeposits = 0;
    let balancesLoaded = false;
    let balanceFailure: unknown = null;
    const bankAccounts: BankAccountSummary[] = [];
    const syncedAccounts: SyncedAccountBalances[] = [];

    // Bank balances: depository adds; credit/loan accumulates separately
    // (reconciled against Spinwheel by the caller); investment/brokerage excluded.
    for (const [i, result] of balanceResults.entries()) {
      if (result.status === 'rejected') {
        if (balanceFailure === null) balanceFailure = result.reason;
        continue;
      }
      balancesLoaded = true;
      syncedAccounts.push({
        itemId: items[i]!.itemId,
        accounts: result.value.accounts.map((acct) => ({
          accountId: acct.account_id,
          name: acct.name,
          type: acct.type,
          subtype: acct.subtype,
          balance: acct.balances.current ?? acct.balances.available,
        })),
      });
      for (const acct of result.value.accounts) {
        if (acct.type === 'investment' || acct.type === 'brokerage') continue;
        const balance = acct.balances.current ?? acct.balances.available ?? 0;
        if (acct.type === 'depository') {
          bankTotal += balance;
          // Only genuinely spendable balances count toward the ladder's
          // emergency-fund rungs. A CD, an HSA, a GIC and an EBT balance are
          // all `depository` to Plaid and none of them is money the user can
          // reach in an emergency. See networth/account-taxonomy.ts.
          if (countsAsLiquidCash(acct.type, acct.subtype)) {
            liquidDeposits += Math.max(0, balance);
          }
        } else if (acct.type === 'credit' || acct.type === 'loan') {
          plaidDebtTotal += balance;
        }
        const meta = liabilityMeta.get(acct.account_id);
        bankAccounts.push({
          accountId: acct.account_id,
          name: acct.name,
          type: acct.type,
          subtype: acct.subtype,
          balance,
          minPayment: meta?.minPayment ?? null,
          nextDueDate: meta?.nextDueDate ?? null,
          isOverdue: meta?.isOverdue ?? null,
          primaryApr: meta?.primaryApr ?? null,
        });
      }
    }

    // Investment holdings, counting only what the user actually owns.
    let investmentsTotal = 0;
    let holdingsFailure: unknown = null;
    const investmentHoldings: HoldingSummary[] = [];
    for (const result of holdingsResults) {
      if (result.status === 'rejected') {
        if (holdingsFailure === null) holdingsFailure = result.reason;
        continue;
      }
      const summarised = summariseHoldings(result.value.holdings, result.value.securities);
      investmentsTotal += summarised.total;
      investmentHoldings.push(...summarised.holdings);
    }

    return {
      bankTotal,
      plaidDebtTotal,
      liquidDeposits,
      investmentsTotal,
      bankAccounts,
      investmentHoldings,
      hasConnectedAccount: true,
      balancesLoaded,
      syncedAccounts,
      allHoldingsSucceeded: holdingsFailure === null,
      balanceFailure,
      holdingsFailure,
    };
  } catch {
    // No bank linked, or the item store itself failed. Unknown, not zero.
    return emptyPlaidSnapshot();
  }
}

export type DebtItem = { id: string; type: string; balance: number; monthlyPayment: number };

export type DebtSnapshot = {
  debtsTotal: number;
  debtItems: DebtItem[];
  spinwheelConnected: boolean;
  /** Distinct from `spinwheelConnected`: set only after the bureau fetch
   *  actually returned. If Spinwheel is connected but its fetch throws,
   *  `debtsTotal` stays 0, and suppressing the Plaid debt subtraction on
   *  "connected" alone would make net worth silently jump by the full card and
   *  loan balances. */
  spinwheelDebtsLoaded: boolean;
  debts: SpinwheelDebt[];
  /** The bureau fetch's rejection reason when it failed, else null. Lets the
   *  refresh path record an honest error class (prd.md R-8.1). */
  fetchError: unknown;
};

function emptyDebtSnapshot(): DebtSnapshot {
  return {
    debtsTotal: 0,
    debtItems: [],
    spinwheelConnected: false,
    spinwheelDebtsLoaded: false,
    debts: [],
    fetchError: null,
  };
}

export async function fetchDebtSnapshot(userId: string): Promise<DebtSnapshot> {
  try {
    const [connection] = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, userId));
    if (!connection) return emptyDebtSnapshot();

    const snapshot: DebtSnapshot = { ...emptyDebtSnapshot(), spinwheelConnected: true };
    try {
      const debts = await getDebtProfile(connection.spinwheelUserId);
      snapshot.spinwheelDebtsLoaded = true;
      snapshot.debts = debts;
      for (const debt of debts) {
        snapshot.debtsTotal += debt.balance ?? 0;
        snapshot.debtItems.push({
          id: debt.id,
          type: debt.type,
          balance: debt.balance ?? 0,
          monthlyPayment: debt.minimumPayment ?? 0,
        });
      }
    } catch (err) {
      // Bureau fetch failed; connected but not loaded.
      snapshot.fetchError = err;
    }
    return snapshot;
  } catch {
    // spinwheel not connected or error
    return emptyDebtSnapshot();
  }
}

/** Balances on debts above HIGH_APR_THRESHOLD, the ladder rung 3 input.
 *
 *  Source preference mirrors the net-worth reconciliation: the credit bureau
 *  (Spinwheel) when it loaded, since it sees accounts at institutions the user
 *  has not linked; otherwise the Plaid-visible credit accounts. Never both,
 *  which would double-count the same card.
 *
 *  Units: both Spinwheel `interestRate` and Plaid `apr_percentage` are
 *  percentages (18 means 18%), while HIGH_APR_THRESHOLD is a fraction (0.1).
 *
 *  A credit card with an UNKNOWN rate counts as high-APR. Rungs never
 *  un-complete (DR-15), so wrongly completing rung 3 is permanent while wrongly
 *  holding it open self-corrects when the rate arrives; and a card with no
 *  reported APR is almost never below 10%. Unknown-rate loans of other types do
 *  NOT count: mortgages and student loans are usually below the threshold. */
export function highAprDebtBalances(debt: DebtSnapshot, bankAccounts: BankAccountSummary[]): number[] {
  if (debt.spinwheelDebtsLoaded) {
    return debt.debts
      .filter((d) => {
        const balance = d.balance ?? 0;
        if (balance <= 0) return false;
        const rate = d.interestRate ?? null;
        if (rate === null) return d.type === 'CREDIT_CARD';
        return rate / 100 > HIGH_APR_THRESHOLD;
      })
      .map((d) => d.balance ?? 0);
  }

  return bankAccounts
    .filter((a) => {
      if (a.type !== 'credit' || a.balance <= 0) return false;
      if (a.primaryApr === null) return true;
      return a.primaryApr / 100 > HIGH_APR_THRESHOLD;
    })
    .map((a) => a.balance);
}
