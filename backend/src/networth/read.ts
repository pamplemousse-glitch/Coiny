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
  generatedAt: string;
};

export type NetWorthAssembly = {
  response: NetWorthResponse;
  goalInputs: GoalRefreshInputs;
  /** True when any connected class is excluded from the total. A degraded
   *  total must never be persisted as the milestone baseline. */
  degraded: boolean;
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

  for (const acct of activeAccounts) {
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
  const invHoldings = ((invRow?.payload as { holdings?: HoldingSummary[] } | null)?.holdings ?? []) as HoldingSummary[];
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
    metalRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
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

  // Vinyl (Discogs): register row DR-10 pins the served value to 0 until
  // written permission plus attribution plus the six-hour display rule exist.
  // The connection is reported so the UI can explain why no value appears.
  const [discogsRow] = discogsRows;
  classes.vinyl = discogsRow ? reading(0, null, 'ok') : reading(null, null, 'not_connected');

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
  for (const name of Object.keys(classes) as NetWorthClassName[]) {
    const c = classes[name];
    if (includedInTotal(c.status)) {
      total += name === 'debts' ? -(c.value ?? 0) : (c.value ?? 0);
    } else if (c.status !== 'not_connected') {
      excludedClasses.push(name);
    }
  }

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
    generatedAt: now.toISOString(),
  };

  return { response, goalInputs, degraded: excludedClasses.length > 0 };
}
