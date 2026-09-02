// The DB-only net-worth assembly (prd.md R-16.1): every class is served from
// stored values with an honest { value, asOf, status } reading; no external
// call ever runs here. The same assembly also produces the goal-refresh inputs
// so the endpoint, the explicit refresh, and the scheduler all read the SAME
// numbers (the invariant that used to live in goals/snapshot.ts).
//
// Total policy (prd.md R-8.1/R-8.4, engineering-budgets.md section 4):
// - `ok` and `stale` values are included in `total`;
// - `error`, `pending`, `disconnected`, and `stale_excluded` are excluded and
//   counted in `excluded`, so an outage is visible instead of reading as a
//   smaller number;
// - the legacy scalar fields keep their names and show the last known value
//   (`value ?? 0`), which means they no longer necessarily sum to `total` when
//   `excluded.count > 0`. That is the honest behaviour: the per-class `status`
//   says why.

import { eq } from 'drizzle-orm';
import { isSharedCoinbaseKeyAllowed } from '../config.js';
import { db } from '../db/client.js';
import {
  alpacaConnections,
  chainWallets,
  coinbaseConnections,
  coinHoldings,
  discogsConnections,
  energyPositions,
  farmlandParcels,
  hyperliquidAccounts,
  kalshiConnections,
  krakenConnections,
  manualAssets,
  metalHoldings,
  nftWallets,
  plaidItems,
  pokemonCardHoldings,
  polymarketAccounts,
  realEstateAssets,
  sneakerHoldings,
  spinwheelConnections,
  tradingCardHoldings,
  truelayerConnections,
  vehicleAssets,
  ynabConnections,
  zerionWallets,
} from '../db/schema.js';
import type { GoalRefreshInputs } from '../goals/refresh.js';
import {
  type BankAccountSummary,
  type DebtItem,
  type DebtSnapshot,
  type HoldingSummary,
  highAprDebtBalances,
} from '../goals/snapshot.js';
import type { SpinwheelDebt } from '../spinwheel/client.js';
import { getClassCache, getPlaidAccountBalances } from '../store/asset-cache.js';
import { type ConnectionHealthRow, deriveConnectionStatus, isUserActionable } from '../store/connection-health.js';
import { declaredNetUsd, listDeclaredAssets, oldestRefreshedAt } from '../store/declared-assets.js';
import { getCachedLiabilities } from '../store/plaid-liabilities.js';
import { getRecentOutflows } from '../store/transactions.js';
import { type AccountCategory, classifyAccount } from './account-taxonomy.js';
import {
  type ClassReading,
  type ClassStatus,
  deriveStatus,
  FRESHNESS,
  includedInTotal,
  type NetWorthClassName,
  reading,
  rollupRows,
} from './classes.js';

export type CryptoPosition = { id: string; name: string; symbol: string; amount: number; valueUSD: number };

export type BankAccountReading = BankAccountSummary & {
  asOf: string | null;
  /** The coarse bucket a user thinks in, derived from type + subtype. */
  category: AccountCategory;
  /** Human-readable wrapper name: "Roth IRA", "Cash ISA", "Certificate of Deposit". */
  subtypeLabel: string;
  taxAdvantaged: boolean;
  /** Spendable today. Drives what counts toward the emergency fund. */
  liquid: boolean;
};

export type NetWorthResponse = {
  total: number;
  bank: number;
  investments: number;
  crypto: number;
  defi: number;
  chainWallets: number;
  hyperliquid: number;
  polymarket: number;
  realEstate: number;
  vehicles: number;
  metals: number;
  sneakers: number;
  nft: number;
  manual: number;
  declared: number;
  pokemonCards: number;
  kalshi: number;
  kraken: number;
  alpaca: number;
  ynab: number;
  vinyl: number;
  truelayer: number;
  energy: number;
  farmland: number;
  tradingCards: number;
  coins: number;
  debts: number;
  liquidCashMonths: number | null;
  accounts: {
    bank: BankAccountReading[];
    investments: HoldingSummary[];
    investmentsSummary: {
      /** Unvested equity, EXCLUDED from every total. Null when unknown. */
      unvestedUSD: number | null;
      /** Cash-equivalent securities, INCLUDED in the investments total. */
      cashEquivalentUSD: number | null;
      /** The subset of the above held in TAXABLE accounts, which also counts
       *  toward the ladder's emergency-fund rungs. Money market funds inside a
       *  401(k) or IRA are excluded: reaching them costs tax and a penalty. */
      liquidCashEquivalentUSD: number;
    };
    crypto: CryptoPosition[];
    defi: {
      totalUSD: number;
      /** Zerion's wallet/deposited/borrowed/locked/staked split. Null means
       *  Zerion omitted it, NOT that every bucket is zero. */
      breakdown: { wallet: number; deposited: number; borrowed: number; locked: number; staked: number } | null;
      /** Value the spam filter removed from the vendor's own total. Null when
       *  the positions list was truncated and the filtered sum was not used. */
      spamFilteredUSD: number | null;
      /** Positions Zerion declined to price, excluded rather than counted as
       *  zero (R-8.1). */
      unpricedCount: number | null;
      /** Positions excluded for thin liquidity, and their quoted value. NOT
       *  spam (#295 handles that): real holdings in tokens that cannot be sold
       *  at the quoted price. Excluded from `totalUSD` and from the reactive
       *  signal, so the creature never celebrates a gain nobody could take. */
      illiquidCount: number | null;
      illiquidUSD: number | null;
    };
    debts: DebtItem[];
  };
  connections: {
    coinbase: boolean;
    discogs: boolean;
    kalshi: boolean;
    kraken: boolean;
    alpaca: boolean;
    spinwheel: boolean;
    truelayer: boolean;
    ynab: boolean;
    zerion: boolean;
  };
  classes: Record<NetWorthClassName, ClassReading>;
  excluded: { count: number; classes: NetWorthClassName[] };
  /** Individual connections that are NOT healthy (survey gap 2).
   *
   *  `connections` above answers "is this provider linked", and `classes`
   *  answers "is this asset class trustworthy". Neither can say WHICH of a
   *  user's three wallets died, so neither can be prompted about, which is the
   *  gap this closes.
   *
   *  An EXCEPTION REPORT, not an inventory: a healthy account sends an empty
   *  array. Same principle as `excluded` and `/health/integrations`, and it
   *  keeps the payload flat for the common case (engineering-budgets section 1).
   *
   *  Additive rather than a change to `connections`, so a shipped client that
   *  has never heard of this field keeps working unchanged (R-14.2). */
  connectionHealth: ConnectionHealthEntry[];
  generatedAt: string;
};

export type ConnectionHealthEntry = {
  /** Stable across refreshes, so a client can dismiss or track one entry. */
  id: string;
  provider: string;
  /** What to call it on screen. Displayable user financial data: it may appear
   *  in an API response and must never appear in a log line, the same rule
   *  `plaid_items.institutionName` carries for the same reason. */
  label: string;
  status: ClassStatus;
  /** True when the USER is the one who can fix it, which is the only case that
   *  earns a prompt. A rate limit or a vendor outage is ours, and telling
   *  someone to reconnect over one trains them to ignore the message. */
  actionable: boolean;
  lastSyncedAt: string | null;
};

export type NetWorthAssembly = {
  response: NetWorthResponse;
  goalInputs: GoalRefreshInputs;
  /** True when any connected class is excluded from the total. A degraded
   *  total must never be persisted as the milestone baseline. */
  degraded: boolean;
  /**
   * How old the figures behind the total are: the OLDEST `asOf` among the
   * classes included in it, or null when at least one contributing class has no
   * timestamp at all.
   *
   * Computed here rather than by any caller, because this is the one place that
   * already knows which classes are in the total and what each one's age is.
   * A second copy of that rule would be the exact drift `connection-health.ts`
   * refuses to create with `deriveConnectionStatus`.
   *
   * Null means the age is UNKNOWN, which is not the same as fresh and must not
   * render as "just now".
   */
  inputsAsOf: Date | null;
};

type SimpleRow = { valueUsd: number | null; syncedAt: Date | null };

function num(v: string | null): number | null {
  return v !== null ? parseFloat(v) : null;
}

/**
 * A revoked or rejected credential, read off the cache row (testing-strategy
 * section 8 item 4).
 *
 * The per-class health machinery was Plaid-shaped: `bankHealth` is computed
 * from `plaid_items.status` and every other class passed no `health` at all, so
 * a Coinbase key the user revoked read as a generic `error` or, worse, as
 * `stale` beside a confident total. Coinbase, Kraken, Zerion and the rest can
 * all revoke or expire a key, and the user cannot fix what the app does not
 * name.
 *
 * No schema change is needed for this: `classifyError` already maps 401 and 403
 * to `'auth'` and `recordClassFailure` already stores it, so the fact was being
 * recorded and thrown away at the read. A later success clears `lastErrorClass`
 * (`recordClassSuccess`), so this cannot latch on after the user re-links.
 *
 * Narrow on purpose. Only `'auth'`: a `429`, a `5xx` or a `timeout` is the
 * vendor's problem and asking the user to re-authenticate over it is how a
 * warning becomes noise.
 */
function credentialHealth(row: { lastErrorClass: string | null } | undefined): 'reauth_required' | null {
  return row?.lastErrorClass === 'auth' ? 'reauth_required' : null;
}

/** `0x1234…cdef`. The user's own address shown back to them, shortened because
 *  a 42-character string is not a label. Never logged: a wallet address is a
 *  permanent global identifier and is on the forbidden list in
 *  plugins/logger.ts, which is why this is an API-response-only helper. */
function truncateAddress(address: string): string {
  return address.length <= 12 ? address : `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
}

export async function assembleNetWorth(userId: string, now: Date = new Date()): Promise<NetWorthAssembly> {
  // Every read this function needs, issued together (audit 4.7.2).
  //
  // These used to be 28 sequential `await`s spread down the body, not one of
  // them inside a Promise.all, so an authenticated GET /api/net-worth paid 28
  // Postgres round trips end to end before any of them could overlap. At a 2 ms
  // Neon round trip that is ~56 ms of pure waiting, and it is worse than that
  // when the compute has scaled to zero and the first query also pays
  // reactivation (4.5.5).
  //
  // Every one is an independent `WHERE user_id = $1` against a different table:
  // no query's arguments come from another's result, which is what makes this
  // safe to batch rather than merely faster. The postgres.js pool is `max: 5`
  // (db/client.ts), so this does not open 28 connections; it fills the pool and
  // drains in about six waves instead of twenty-eight.
  //
  // Promise.all rather than starting the promises early and awaiting each in
  // place: an unawaited rejection would reach the process-level
  // `unhandledRejection` handler (util/log.ts) and be logged as an error before
  // the code that actually handles it ran. Promise.all attaches handlers to all
  // of them synchronously.
  //
  // Anything added here must stay independent of the others. A query that needs
  // a previous result belongs below, not in this list.
  const [
    classCache,
    items,
    balanceRows,
    liabilityRows,
    coinbaseRows,
    zerionRows,
    spinwheelRows,
    chainRows,
    hlRows,
    pmRows,
    reRows,
    vehRows,
    metalRows,
    sneakerRows,
    nftRows,
    manualRows,
    declaredLines,
    pokemonRows,
    ynabRows,
    krakenRows,
    alpacaRows,
    discogsRows,
    kalshiRows,
    energyRows,
    farmRows,
    tcRows,
    coinRows,
    tlRows,
  ] = await Promise.all([
    getClassCache(userId),
    db().select().from(plaidItems).where(eq(plaidItems.userId, userId)),
    getPlaidAccountBalances(userId),
    getCachedLiabilities(userId),
    db().select().from(coinbaseConnections).where(eq(coinbaseConnections.userId, userId)),
    db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId)),
    db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, userId)),
    db().select().from(chainWallets).where(eq(chainWallets.userId, userId)),
    db().select().from(hyperliquidAccounts).where(eq(hyperliquidAccounts.userId, userId)),
    db().select().from(polymarketAccounts).where(eq(polymarketAccounts.userId, userId)),
    db().select().from(realEstateAssets).where(eq(realEstateAssets.userId, userId)),
    db().select().from(vehicleAssets).where(eq(vehicleAssets.userId, userId)),
    db().select().from(metalHoldings).where(eq(metalHoldings.userId, userId)),
    db().select().from(sneakerHoldings).where(eq(sneakerHoldings.userId, userId)),
    db().select().from(nftWallets).where(eq(nftWallets.userId, userId)),
    db().select().from(manualAssets).where(eq(manualAssets.userId, userId)),
    listDeclaredAssets(userId),
    db().select().from(pokemonCardHoldings).where(eq(pokemonCardHoldings.userId, userId)),
    db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId)),
    db().select().from(krakenConnections).where(eq(krakenConnections.userId, userId)),
    db().select().from(alpacaConnections).where(eq(alpacaConnections.userId, userId)),
    db().select().from(discogsConnections).where(eq(discogsConnections.userId, userId)),
    db().select().from(kalshiConnections).where(eq(kalshiConnections.userId, userId)),
    db().select().from(energyPositions).where(eq(energyPositions.userId, userId)),
    db().select().from(farmlandParcels).where(eq(farmlandParcels.userId, userId)),
    db().select().from(tradingCardHoldings).where(eq(tradingCardHoldings.userId, userId)),
    db().select().from(coinHoldings).where(eq(coinHoldings.userId, userId)),
    db().select().from(truelayerConnections).where(eq(truelayerConnections.userId, userId)),
  ]);

  const classes = {} as Record<NetWorthClassName, ClassReading>;

  // --- Bank (Plaid) from the per-account balance cache -----------------------
  const activeItemIds = new Set(items.filter((i) => !i.disabled).map((i) => i.itemId));

  const liabilityMeta = new Map(
    liabilityRows.map((row) => [
      row.accountId,
      {
        minPayment: num(row.minPayment),
        nextDueDate: row.nextDueDate ?? null,
        isOverdue: row.isOverdue ?? null,
        primaryApr: num(row.primaryApr),
      },
    ]),
  );

  const bankPolicy = FRESHNESS.bank;
  const activeAccounts = balanceRows.filter((r) => activeItemIds.has(r.itemId));
  const isExpired = (asOf: Date): boolean =>
    bankPolicy.excludeMs !== null && now.getTime() - asOf.getTime() > bankPolicy.excludeMs;

  let bankDepositoryTotal = 0;
  let plaidDebtTotal = 0;
  let liquidDeposits = 0;
  let bankOldestAsOf: Date | null = null;
  let anyIncludedAccount = false;
  const bankAccounts: BankAccountReading[] = [];
  /** Every account's tax treatment, INCLUDING investment ones, which the loop
   *  below skips for balance purposes. Needed to decide whether a
   *  cash-equivalent holding inside a brokerage is reachable in an emergency:
   *  a money market fund in a taxable account is, the same fund inside a
   *  401(k) is not. */
  const accountIsTaxAdvantaged = new Map<string, boolean>();
  const accountIsExpired = new Map<string, boolean>();

  for (const acct of activeAccounts) {
    accountIsTaxAdvantaged.set(acct.accountId, classifyAccount(acct.type, acct.subtype).taxAdvantaged);
    accountIsExpired.set(acct.accountId, isExpired(acct.asOf));
    if (acct.type === 'investment' || acct.type === 'brokerage') continue;
    const balance = num(acct.balance) ?? 0;
    const meta = liabilityMeta.get(acct.accountId);
    const classification = classifyAccount(acct.type, acct.subtype);
    bankAccounts.push({
      accountId: acct.accountId,
      name: acct.name,
      type: acct.type,
      subtype: acct.subtype,
      category: classification.category,
      subtypeLabel: classification.label,
      taxAdvantaged: classification.taxAdvantaged,
      liquid: classification.liquid,
      balance,
      minPayment: meta?.minPayment ?? null,
      nextDueDate: meta?.nextDueDate ?? null,
      isOverdue: meta?.isOverdue ?? null,
      primaryApr: meta?.primaryApr ?? null,
      asOf: acct.asOf.toISOString(),
    });
    // Accounts past the never-show age are listed (with their asOf, so the UI
    // can mute them) but contribute nothing to any total.
    if (isExpired(acct.asOf)) continue;
    anyIncludedAccount = true;
    if (bankOldestAsOf === null || acct.asOf.getTime() < bankOldestAsOf.getTime()) bankOldestAsOf = acct.asOf;
    if (acct.type === 'depository') {
      bankDepositoryTotal += balance;
      // Same correction as goals/snapshot.ts: a CD or an HSA is `depository`
      // and is not emergency cash. This figure reaches liquidCashMonths below
      // and the ladder's emergency-fund rungs.
      if (classification.liquid) liquidDeposits += Math.max(0, balance);
    } else if (acct.type === 'credit' || acct.type === 'loan') {
      plaidDebtTotal += balance;
    }
  }

  const bankCacheRow = classCache.get('bank');
  const bankConnected = items.length > 0;
  const bankDisconnected = bankConnected && activeItemIds.size === 0;
  // Worst lifecycle state across the user's live items (R-8.5). One broken bank
  // out of three still means the number cannot be refreshed, so the class must
  // say so rather than averaging the problem away. reauth_required outranks
  // expiring: a lapsed login is happening now, a warning is about later.
  const liveItems = items.filter((i) => !i.disabled);
  const bankHealth: 'reauth_required' | 'expiring' | null = liveItems.some((i) => i.status === 'reauth_required')
    ? 'reauth_required'
    : liveItems.some((i) => i.status === 'expiring')
      ? 'expiring'
      : null;
  // A successful refresh that found zero accounts is a measured zero, not a
  // pending state; the bank bookkeeping row's asOf records that success.
  const bankSyncedEmpty = activeAccounts.length === 0 && bankCacheRow?.asOf != null;
  let bankStatus: ClassStatus;
  if (!bankConnected) bankStatus = 'not_connected';
  else if (bankDisconnected) bankStatus = 'disconnected';
  else if (activeAccounts.length === 0) {
    if (bankSyncedEmpty) {
      bankStatus = deriveStatus({
        connected: true,
        value: 0,
        asOf: bankCacheRow?.asOf ?? null,
        failed: false,
        health: bankHealth,
        policy: bankPolicy,
        now,
      });
    } else {
      bankStatus = bankCacheRow?.lastErrorClass ? 'error' : 'pending';
    }
    bankOldestAsOf = bankCacheRow?.asOf ?? null;
  } else if (!anyIncludedAccount) bankStatus = 'stale_excluded';
  else {
    bankStatus = deriveStatus({
      connected: true,
      value: bankDepositoryTotal,
      asOf: bankOldestAsOf,
      failed: false,
      health: bankHealth,
      policy: bankPolicy,
      now,
    });
  }
  const balancesLoaded = anyIncludedAccount || (bankSyncedEmpty && includedInTotal(bankStatus));

  // --- Investments (Plaid holdings, cached) ----------------------------------
  const invRow = classCache.get('investments');
  const invPayload = invRow?.payload as {
    holdings?: HoldingSummary[];
    cashEquivalent?: number;
    unvested?: number;
  } | null;
  const invHoldings = (invPayload?.holdings ?? []) as HoldingSummary[];

  // Cash-equivalent holdings in TAXABLE accounts are emergency money.
  //
  // `liquidDeposits` above counts depository accounts only, so someone whose
  // emergency fund sits in a money market fund (Fidelity SPAXX, Vanguard
  // VMFXX, Schwab SWVXX) was told they had NO emergency fund at all, and the
  // creature worried about a person doing exactly the right thing.
  //
  // Every authority treats these as emergency funds and none draws a
  // bank-account-only line: FINRA lists money market funds beside bank
  // accounts on safety/liquidity/accessibility rather than account type,
  // Vanguard calls them "ideal for emergency funds", Fidelity markets SPAXX
  // for precisely this, and the Bogleheads wiki names "a money market fund or
  // a bank savings account" in the same breath. The line the field actually
  // draws is the accounting one — cash and cash equivalents: stable principal,
  // same-day to T+2 access, no penalty on the amount counted.
  //
  // The TAX WRAPPER is what disqualifies, not the institution. The same fund
  // inside a 401(k) or Traditional IRA costs tax plus a 10% penalty to reach,
  // so it is not emergency money. `taxAdvantaged` already encodes that.
  //
  // A Roth IRA is deliberately excluded even though contributions can be
  // withdrawn penalty-free: counting it correctly needs contribution-basis
  // tracking we do not have, and guessing at the basis would overstate. The
  // consensus is that it is a second-tier reserve at best.
  //
  // Conservative on every unknown: a holding whose account we cannot classify
  // does NOT count, because we cannot show it is reachable.
  let liquidCashEquivalents = 0;
  for (const h of invHoldings) {
    if (h.isCashEquivalent !== true) continue;
    if (h.accountId == null) continue;
    const taxAdvantaged = accountIsTaxAdvantaged.get(h.accountId);
    if (taxAdvantaged !== false) continue;
    if (accountIsExpired.get(h.accountId) === true) continue;
    liquidCashEquivalents += Math.max(0, h.value);
  }
  liquidDeposits += liquidCashEquivalents;
  // A bank item does not imply investment accounts, so the class counts as
  // connected only once a holdings refresh has produced a cache row (a
  // successful fetch of zero holdings writes value 0, status ok). Before that
  // it is not_connected, never a phantom excluded class on every bank user.
  const invStatus = deriveStatus({
    connected: bankConnected && invRow !== undefined,
    disconnected: bankDisconnected,
    health: bankHealth,
    value: num(invRow?.valueUsd ?? null),
    asOf: invRow?.asOf ?? null,
    failed: !!invRow?.lastErrorClass && invRow?.asOf === null,
    policy: FRESHNESS.investments,
    now,
  });
  classes.investments = reading(num(invRow?.valueUsd ?? null), invRow?.asOf ?? null, invStatus);

  // --- Crypto (Coinbase, cached) ---------------------------------------------
  const [coinbaseRow] = coinbaseRows;
  // A 'dev_key' connection signs with the operator's shared key; serving that in
  // production would count the operator's balances as this user's.
  const coinbaseUsable = !!coinbaseRow && (coinbaseRow.mode !== 'dev_key' || isSharedCoinbaseKeyAllowed());
  const cryptoRow = classCache.get('crypto');
  const cryptoPositions = ((cryptoRow?.payload as { positions?: CryptoPosition[] } | null)?.positions ??
    []) as CryptoPosition[];
  const cryptoStatus = deriveStatus({
    connected: coinbaseUsable,
    health: credentialHealth(cryptoRow),
    value: num(cryptoRow?.valueUsd ?? null),
    asOf: cryptoRow?.asOf ?? null,
    failed: !!cryptoRow?.lastErrorClass && cryptoRow?.asOf === null,
    policy: FRESHNESS.crypto,
    now,
  });
  classes.crypto = reading(num(cryptoRow?.valueUsd ?? null), cryptoRow?.asOf ?? null, cryptoStatus);

  // --- DeFi (Zerion, cached) -------------------------------------------------
  const defiRow = classCache.get('defi');
  const defiPayload = defiRow?.payload as {
    breakdown?: { wallet: number; deposited: number; borrowed: number; locked: number; staked: number } | null;
    spamFiltered?: number;
    unpriced?: number;
    illiquidCount?: number;
    illiquidValue?: number;
  } | null;
  const defiStatus = deriveStatus({
    connected: zerionRows.length > 0,
    health: credentialHealth(defiRow),
    value: num(defiRow?.valueUsd ?? null),
    asOf: defiRow?.asOf ?? null,
    failed: !!defiRow?.lastErrorClass && defiRow?.asOf === null,
    policy: FRESHNESS.defi,
    now,
  });
  classes.defi = reading(num(defiRow?.valueUsd ?? null), defiRow?.asOf ?? null, defiStatus);

  // --- Debts (Spinwheel, cached) ---------------------------------------------
  const [spinwheelRow] = spinwheelRows;
  const debtsRow = classCache.get('debts');
  const debtsPayload = debtsRow?.payload as { items?: DebtItem[]; debts?: SpinwheelDebt[] } | null;
  const debtItems = (debtsPayload?.items ?? []) as DebtItem[];
  const debtsStatus = deriveStatus({
    connected: !!spinwheelRow,
    health: credentialHealth(debtsRow),
    value: num(debtsRow?.valueUsd ?? null),
    asOf: debtsRow?.asOf ?? null,
    failed: !!debtsRow?.lastErrorClass && debtsRow?.asOf === null,
    policy: FRESHNESS.debts,
    now,
  });
  classes.debts = reading(num(debtsRow?.valueUsd ?? null), debtsRow?.asOf ?? null, debtsStatus);
  const debtsUsable = includedInTotal(debtsStatus);
  const debtsTotal = debtsUsable ? (num(debtsRow?.valueUsd ?? null) ?? 0) : 0;

  // Reconcile the two debt sources: the bureau (Spinwheel) sees the same cards
  // Plaid does, so subtract Plaid-visible debt only when no usable bureau data
  // exists. Past the debts never-show age this falls back automatically.
  const bankTotal = debtsUsable ? bankDepositoryTotal : bankDepositoryTotal - plaidDebtTotal;

  // When every account is past the never-show age the class still reports its
  // muted last value (the UI shows it labelled and excluded), computed over all
  // active accounts since the included set is empty.
  let bankClassValue: number | null =
    bankConnected && activeAccounts.length > 0 ? bankTotal : bankSyncedEmpty ? 0 : null;
  if (bankStatus === 'stale_excluded') {
    let mutedDepository = 0;
    let mutedDebt = 0;
    let mutedOldest: Date | null = null;
    for (const acct of activeAccounts) {
      const balance = num(acct.balance) ?? 0;
      if (acct.type === 'depository') mutedDepository += balance;
      else if (acct.type === 'credit' || acct.type === 'loan') mutedDebt += balance;
      if (mutedOldest === null || acct.asOf.getTime() < mutedOldest.getTime()) mutedOldest = acct.asOf;
    }
    bankClassValue = debtsUsable ? mutedDepository : mutedDepository - mutedDebt;
    bankOldestAsOf = mutedOldest;
  }
  classes.bank = reading(bankClassValue, bankOldestAsOf, bankStatus);

  // --- Simple per-row synced classes -----------------------------------------
  classes.chainWallets = rollupRows(
    chainRows.map((r): SimpleRow => ({ valueUsd: num(r.lastBalanceUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.chainWallets,
    now,
  );

  classes.hyperliquid = rollupRows(
    hlRows.map((r): SimpleRow => ({ valueUsd: num(r.lastAccountValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.hyperliquid,
    now,
  );

  classes.polymarket = rollupRows(
    pmRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.polymarket,
    now,
  );

  classes.realEstate = rollupRows(
    reRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.realEstate,
    now,
  );

  classes.vehicles = rollupRows(
    vehRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.vehicles,
    now,
  );

  classes.metals = rollupRows(
    // The vendor's quote time in preference to our fetch time. Metals markets
    // close at weekends, so a Sunday sync holds Friday's close; reporting that
    // as seconds old is a freshness claim we cannot support. Falls back to
    // lastSyncedAt for pre-0058 rows and for vendors that send no timestamp.
    metalRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.priceAsOf ?? r.lastSyncedAt })),
    FRESHNESS.metals,
    now,
  );

  classes.sneakers = rollupRows(
    sneakerRows.map(
      (r): SimpleRow => ({
        valueUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) * r.quantity : null,
        syncedAt: r.lastSyncedAt,
      }),
    ),
    FRESHNESS.sneakers,
    now,
  );

  classes.nft = rollupRows(
    nftRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.nft,
    now,
  );

  // Manual assets are self-reported: always labelled, never stale, never
  // excluded (prd.md R-8.2). asOf is the OLDEST declaration so age is honest.
  if (manualRows.length === 0) {
    classes.manual = reading(null, null, 'not_connected');
  } else {
    const manualSum = manualRows.reduce((sum, r) => sum + parseFloat(r.selfReportedValueUsd), 0);
    const oldest = manualRows.reduce<Date | null>(
      (acc, r) => (acc === null || r.lastUpdatedAt.getTime() < acc.getTime() ? r.lastUpdatedAt : acc),
      null,
    );
    classes.manual = reading(manualSum, oldest, 'ok');
  }

  // Declared values (the onboarding sheet, R-5.3) are the third data tier
  // alongside connected and derived (register DR-21). The user told us, and
  // the user is still the source, so the class is always labelled
  // "self-reported <date>" and never excluded for age (R-8.2): no freshness
  // policy is consulted. The value is the SIGNED net of the sheet (declared
  // credit cards and student loans subtract), so the total adds it as-is.
  // asOf is the OLDEST refreshedAt so the label never understates age. A sheet
  // whose every line skipped the amount reads value null (a number we cannot
  // compute is never rendered as zero), which contributes nothing to `total`.
  if (declaredLines.length === 0) {
    classes.declared = reading(null, null, 'not_connected');
  } else {
    classes.declared = reading(declaredNetUsd(declaredLines), oldestRefreshedAt(declaredLines), 'ok');
  }

  classes.pokemonCards = rollupRows(
    pokemonRows.map(
      (r): SimpleRow => ({
        valueUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) * r.quantity : null,
        syncedAt: r.lastSyncedAt,
      }),
    ),
    FRESHNESS.pokemonCards,
    now,
  );

  const [ynabRow] = ynabRows;
  classes.ynab = ynabRow
    ? reading(
        num(ynabRow.lastNetWorthUsd),
        ynabRow.lastSyncedAt,
        deriveStatus({
          connected: true,
          value: num(ynabRow.lastNetWorthUsd),
          asOf: ynabRow.lastSyncedAt,
          failed: false,
          policy: FRESHNESS.ynab,
          now,
        }),
      )
    : reading(null, null, 'not_connected');

  const [krakenRow] = krakenRows;
  classes.kraken = krakenRow
    ? reading(
        num(krakenRow.lastTotalUsd),
        krakenRow.lastSyncedAt,
        deriveStatus({
          connected: true,
          value: num(krakenRow.lastTotalUsd),
          asOf: krakenRow.lastSyncedAt,
          failed: false,
          policy: FRESHNESS.kraken,
          now,
        }),
      )
    : reading(null, null, 'not_connected');

  const [alpacaRow] = alpacaRows;
  classes.alpaca = alpacaRow
    ? reading(
        num(alpacaRow.lastEquityUsd),
        alpacaRow.lastSyncedAt,
        deriveStatus({
          connected: true,
          value: num(alpacaRow.lastEquityUsd),
          asOf: alpacaRow.lastSyncedAt,
          failed: false,
          policy: FRESHNESS.alpaca,
          now,
        }),
      )
    : reading(null, null, 'not_connected');

  // Vinyl (Discogs): register row DR-10 withholds the served value until
  // written permission plus attribution plus the six-hour display rule exist.
  // The connection is still reported so the UI can explain why no value appears.
  //
  // This used to be `reading(0, null, 'ok')`, which is the defect audit 2.13
  // names: a connected user's records were reported as WORTH ZERO, with the
  // status that means "this number is good". A withheld value and a value of
  // zero are different facts, and `ok` asserted the wrong one into the total.
  //
  // `stale_excluded` because it is the one status that carries the three
  // properties this state needs: the value is null, it is out of `total`, and
  // it lands in `excluded.classes` so the UI has something to explain rather
  // than a silent hole. The word is imprecise, since nothing here is stale, but
  // the alternatives are worse: `error` blames a vendor that did nothing wrong,
  // `not_connected` denies a connection the user made, and a new status decodes
  // as `.stale` on the client anyway (API+Performance.swift:20-26), so it would
  // buy the same rendering for an API change. Revisit when iOS carries a case
  // for "withheld", or delete all of it when Discogs answers the permission
  // request drafted in vendor-outreach.md §1.
  const [discogsRow] = discogsRows;
  classes.vinyl = discogsRow ? reading(null, null, 'stale_excluded') : reading(null, null, 'not_connected');

  const [kalshiRow] = kalshiRows;
  classes.kalshi = kalshiRow
    ? reading(
        num(kalshiRow.lastPortfolioUsd),
        kalshiRow.lastSyncedAt,
        deriveStatus({
          connected: true,
          value: num(kalshiRow.lastPortfolioUsd),
          asOf: kalshiRow.lastSyncedAt,
          failed: false,
          policy: FRESHNESS.kalshi,
          now,
        }),
      )
    : reading(null, null, 'not_connected');

  classes.energy = rollupRows(
    energyRows.map(
      (r): SimpleRow => ({
        valueUsd: r.lastSpotPriceUsd !== null ? parseFloat(r.quantity) * parseFloat(r.lastSpotPriceUsd) : null,
        syncedAt: r.lastSyncedAt,
      }),
    ),
    FRESHNESS.energy,
    now,
  );

  classes.farmland = rollupRows(
    farmRows.map(
      (r): SimpleRow => ({
        valueUsd: r.lastPricePerAcreUsd !== null ? parseFloat(r.acres) * parseFloat(r.lastPricePerAcreUsd) : null,
        syncedAt: r.lastSyncedAt,
      }),
    ),
    FRESHNESS.farmland,
    now,
  );

  classes.tradingCards = rollupRows(
    tcRows.map(
      (r): SimpleRow => ({
        valueUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) * r.quantity : null,
        syncedAt: r.lastSyncedAt,
      }),
    ),
    FRESHNESS.tradingCards,
    now,
  );

  classes.coins = rollupRows(
    coinRows.map(
      (r): SimpleRow => ({
        valueUsd: r.lastPriceGuideUsd !== null ? parseFloat(r.lastPriceGuideUsd) * r.quantity : null,
        syncedAt: r.lastSyncedAt,
      }),
    ),
    FRESHNESS.coins,
    now,
  );

  const [tlRow] = tlRows;
  // lastBalanceGbp stores USD post-conversion (column name kept for compat).
  classes.truelayer = tlRow
    ? reading(
        num(tlRow.lastBalanceGbp),
        tlRow.lastSyncedAt,
        deriveStatus({
          connected: true,
          value: num(tlRow.lastBalanceGbp),
          asOf: tlRow.lastSyncedAt,
          failed: false,
          policy: FRESHNESS.truelayer,
          now,
        }),
      )
    : reading(null, null, 'not_connected');

  // --- Total: included classes only ------------------------------------------
  const excludedClasses: NetWorthClassName[] = [];
  let total = 0;
  // The age of the whole number, for surfaces that show one figure rather than
  // a per-class table (R-8.2: never an unlabelled stale value, and Home shows
  // real money in its rung detail line). Oldest among the classes that are IN
  // the total, which is the same rule `rollupRows` applies one level down:
  // staleness must never be understated, and a class that is excluded is
  // already reported separately rather than silently ageing the rest.
  //
  // A contributing class with no timestamp leaves this null, meaning "age
  // unknown", which is a different thing from "fresh" and must render
  // differently.
  let oldestIncludedAsOf: Date | null = null;
  let anyIncludedWithoutAsOf = false;
  for (const name of Object.keys(classes) as NetWorthClassName[]) {
    const c = classes[name];
    if (includedInTotal(c.status)) {
      total += name === 'debts' ? -(c.value ?? 0) : (c.value ?? 0);
      // Bank carries no value of its own (its money lives per account), so a
      // null value there is bookkeeping and not a contribution to age.
      if (c.value !== null) {
        if (c.asOf === null) {
          anyIncludedWithoutAsOf = true;
        } else {
          const at = new Date(c.asOf);
          if (oldestIncludedAsOf === null || at < oldestIncludedAsOf) oldestIncludedAsOf = at;
        }
      }
    } else if (c.status !== 'not_connected') {
      excludedClasses.push(name);
    }
  }

  // --- Per-connection health (survey gap 2) ----------------------------------
  //
  // Every connection table that carries the 0062 columns writes them now: the
  // ten credential vendors through `recordSyncFailure` in their extracted
  // syncs, Zerion, Coinbase and Spinwheel through `networth/refresh.ts`. This
  // comment used to say only Zerion did, which was already untrue when it was
  // written and made this list look like a stub rather than the real exception
  // report the Reconnect button on Wealth is built on.
  //
  // Plaid items are deliberately NOT here. They have a stored lifecycle driven
  // by ITEM webhooks and a repair path nothing else has (Link update mode), so
  // they get their own prompt rather than a row in a list whose only remedy is
  // "go and connect it again".
  const connectionHealth: ConnectionHealthEntry[] = [];

  /** Push one connection if it is NOT healthy. `label` is what the user reads:
   *  their own name for the thing where they gave one, else a shortened
   *  address, else the provider's name. Never a full wallet address, which is a
   *  permanent global identifier (see truncateAddress). */
  const pushIfUnhealthy = (provider: string, key: string | number, label: string, row: ConnectionHealthRow): void => {
    const status = deriveConnectionStatus(row);
    if (status === 'ok') return;
    connectionHealth.push({
      id: `${provider}:${key}`,
      provider,
      label,
      status,
      actionable: isUserActionable(status),
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    });
  };

  // Many-per-user connections. This grain is what made gap 2 unanswerable: a
  // class could only ever say "crypto is degraded", never which of eleven
  // wallets stopped working.
  for (const w of zerionRows) pushIfUnhealthy('zerion', w.id, w.label ?? truncateAddress(w.address), w);
  for (const w of chainRows) pushIfUnhealthy('chain', w.id, w.label ?? `${w.chain} ${truncateAddress(w.address)}`, w);
  for (const w of nftRows) pushIfUnhealthy('nft', w.id, truncateAddress(w.address), w);
  for (const w of hlRows) pushIfUnhealthy('hyperliquid', w.id, truncateAddress(w.address), w);
  for (const w of pmRows) pushIfUnhealthy('polymarket', w.id, truncateAddress(w.walletAddress), w);

  // One-per-user connections. Fewer rows, same question: a credential can lapse
  // on exactly one of these while every other is fine, and only the user can
  // fix that one.
  if (krakenRow) pushIfUnhealthy('kraken', 'me', 'Kraken', krakenRow);
  if (alpacaRow) pushIfUnhealthy('alpaca', 'me', 'Alpaca', alpacaRow);
  if (ynabRow) pushIfUnhealthy('ynab', 'me', 'YNAB', ynabRow);
  if (discogsRow) pushIfUnhealthy('discogs', 'me', 'Discogs', discogsRow);
  if (kalshiRow) pushIfUnhealthy('kalshi', 'me', 'Kalshi', kalshiRow);
  if (tlRow) pushIfUnhealthy('truelayer', 'me', 'TrueLayer', tlRow);
  if (coinbaseRow) pushIfUnhealthy('coinbase', 'me', 'Coinbase', coinbaseRow);
  if (spinwheelRow) pushIfUnhealthy('spinwheel', 'me', 'Credit report', spinwheelRow);

  // --- Emergency fund coverage (C4) ------------------------------------------
  let liquidCashMonths: number | null = null;
  try {
    // Deliberately not in the batch above, though it depends on nothing there.
    // It is the one read whose failure is caught and tolerated: coverage goes
    // null and the rest of the response still renders. Inside a Promise.all its
    // rejection would take every other query's result with it, trading a
    // degraded field for a failed request to save one round trip.
    const outflows90 = await getRecentOutflows(userId, 90);
    const totalOutflows90 = outflows90.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
    const avgMonthlyBurn = totalOutflows90 / 3;
    if (avgMonthlyBurn > 0 && liquidDeposits > 0) {
      liquidCashMonths = Math.round((liquidDeposits / avgMonthlyBurn) * 10) / 10;
    }
  } catch (err) {
    // Burn-rate is derived garnish; its failure must not fail the read. Logged
    // by callers via the response being null here, nothing financial to log.
    liquidCashMonths = null;
    void err;
  }

  // --- Goal-system inputs (same numbers the response serves) -----------------
  const debtSnapshotLike: DebtSnapshot = {
    debtsTotal,
    debtItems,
    spinwheelConnected: !!spinwheelRow,
    spinwheelDebtsLoaded: debtsUsable,
    debts: (debtsPayload?.debts ?? []) as SpinwheelDebt[],
    fetchError: null,
  };

  const byClass: Record<string, number> = {};
  for (const name of Object.keys(classes) as NetWorthClassName[]) {
    const c = classes[name];
    const included = includedInTotal(c.status);
    byClass[name] = included ? (name === 'debts' ? -(c.value ?? 0) : (c.value ?? 0)) : 0;
  }

  const goalInputs: GoalRefreshInputs = {
    hasConnectedAccount: bankConnected,
    liquidCash: balancesLoaded ? liquidDeposits : null,
    highAprDebtBalances: highAprDebtBalances(debtSnapshotLike, bankAccounts),
    investedTotal: includedInTotal(invStatus) ? (num(invRow?.valueUsd ?? null) ?? 0) : null,
    // No honest producer exists; rung 5 stays indeterminate by design.
    taxAdvantagedRate: null,
    netWorth: { totalUsd: total, byClass },
  };

  const scalar = (name: NetWorthClassName): number => classes[name].value ?? 0;

  const response: NetWorthResponse = {
    total,
    bank: scalar('bank'),
    investments: scalar('investments'),
    crypto: scalar('crypto'),
    defi: scalar('defi'),
    chainWallets: scalar('chainWallets'),
    hyperliquid: scalar('hyperliquid'),
    polymarket: scalar('polymarket'),
    realEstate: scalar('realEstate'),
    vehicles: scalar('vehicles'),
    metals: scalar('metals'),
    sneakers: scalar('sneakers'),
    nft: scalar('nft'),
    manual: scalar('manual'),
    declared: scalar('declared'),
    pokemonCards: scalar('pokemonCards'),
    kalshi: scalar('kalshi'),
    kraken: scalar('kraken'),
    alpaca: scalar('alpaca'),
    ynab: scalar('ynab'),
    vinyl: 0,
    truelayer: scalar('truelayer'),
    energy: scalar('energy'),
    farmland: scalar('farmland'),
    tradingCards: scalar('tradingCards'),
    coins: scalar('coins'),
    // Legacy semantics preserved: 0 (not a doubled value) when the bureau data
    // is unusable and Plaid-visible debt is already folded into `bank`.
    debts: -debtsTotal,
    liquidCashMonths,
    accounts: {
      bank: bankAccounts,
      investments: invHoldings,
      // Aggregates so the client need not re-sum the holdings array. A
      // sibling key rather than a reshape of `investments`, which the shipped
      // iOS build reads as an array.
      investmentsSummary: {
        // Excluded from every total above. Equity the user does not own yet.
        unvestedUSD: invPayload?.unvested ?? null,
        // INCLUDED in the investments total today. Surfaced because a money
        // market fund inside a brokerage is spendable cash that the ladder's
        // emergency-fund rungs currently do not see: `liquidCash` is built
        // from depository accounts only. Whether to move it is a change to
        // what completes a rung, so it is Antoine's call, not a side effect
        // of capturing the field. See PlaidSecurity.is_cash_equivalent.
        cashEquivalentUSD: invPayload?.cashEquivalent ?? null,
        // The part of cashEquivalentUSD that is reachable in an emergency, so
        // the client can say WHY the ladder's cash figure is larger than the
        // sum of the bank accounts on screen.
        liquidCashEquivalentUSD: liquidCashEquivalents,
      },
      crypto: cryptoPositions,
      // The five-way split #276 parsed and nothing consumed, plus what the
      // spam filter removed. `breakdown` is null when Zerion omitted the
      // distribution, which reads as "unknown" rather than as five zeroes: a
      // breakdown of all-zero is a claim that the wallet holds nothing.
      defi: {
        totalUSD: scalar('defi'),
        breakdown: defiPayload?.breakdown ?? null,
        spamFilteredUSD: defiPayload?.spamFiltered ?? null,
        unpricedCount: defiPayload?.unpriced ?? null,
        // Genuine holdings in tokens almost nobody trades. Excluded from the
        // total on purpose: a position quoting $50,000 against a $500 pool is
        // not $50,000 the user can realise. Shown honestly, not counted.
        illiquidCount: defiPayload?.illiquidCount ?? null,
        illiquidUSD: defiPayload?.illiquidValue ?? null,
      },
      debts: debtsUsable ? debtItems : [],
    },
    connections: {
      // Only after a successful fetch (prd.md R-8.3): a linked-but-never-synced
      // provider reads `classes.<x>.status = pending`, not `connected: true`.
      // Discogs is the exception by design: its value is withheld for licensing
      // reasons, so row existence is the only success signal available.
      coinbase: coinbaseUsable && cryptoRow?.asOf != null,
      discogs: !!discogsRow,
      kalshi: !!kalshiRow && kalshiRow.lastPortfolioUsd !== null,
      kraken: !!krakenRow && krakenRow.lastTotalUsd !== null,
      alpaca: !!alpacaRow && alpacaRow.lastEquityUsd !== null,
      spinwheel: !!spinwheelRow && debtsRow?.asOf != null,
      truelayer: !!tlRow && tlRow.lastBalanceGbp !== null,
      ynab: !!ynabRow && ynabRow.lastNetWorthUsd !== null,
      zerion: zerionRows.length > 0 && defiRow?.asOf != null,
    },
    classes,
    excluded: { count: excludedClasses.length, classes: excludedClasses },
    connectionHealth,
    generatedAt: now.toISOString(),
  };

  return {
    response,
    goalInputs,
    degraded: excludedClasses.length > 0,
    // Unknown beats optimistic: one contributing class with no timestamp makes
    // the whole figure's age unknowable, and saying "as of just now" about it
    // would be the unlabelled stale value R-8.2 exists to prevent.
    inputsAsOf: anyIncludedWithoutAsOf ? null : oldestIncludedAsOf,
  };
}
