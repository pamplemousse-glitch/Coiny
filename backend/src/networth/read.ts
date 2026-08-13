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
import { getCachedLiabilities } from '../store/plaid-liabilities.js';
import { getRecentOutflows } from '../store/transactions.js';
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

export type BankAccountReading = BankAccountSummary & { asOf: string | null };

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
    defi: { totalUSD: number };
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

export async function assembleNetWorth(userId: string, now: Date = new Date()): Promise<NetWorthAssembly> {
  const classCache = await getClassCache(userId);
  const classes = {} as Record<NetWorthClassName, ClassReading>;

  // --- Bank (Plaid) from the per-account balance cache -----------------------
  const items = await db().select().from(plaidItems).where(eq(plaidItems.userId, userId));
  const activeItemIds = new Set(items.filter((i) => !i.disabled).map((i) => i.itemId));
  const balanceRows = await getPlaidAccountBalances(userId);
  const liabilityRows = await getCachedLiabilities(userId);

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
    bankAccounts.push({
      accountId: acct.accountId,
      name: acct.name,
      type: acct.type,
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
      liquidDeposits += Math.max(0, balance);
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
  const [coinbaseRow] = await db().select().from(coinbaseConnections).where(eq(coinbaseConnections.userId, userId));
  // A 'dev_key' connection signs with the operator's shared key; serving that in
  // production would count the operator's balances as this user's.
  const coinbaseUsable = !!coinbaseRow && (coinbaseRow.mode !== 'dev_key' || isSharedCoinbaseKeyAllowed());
  const cryptoRow = classCache.get('crypto');
  const cryptoPositions = ((cryptoRow?.payload as { positions?: CryptoPosition[] } | null)?.positions ??
    []) as CryptoPosition[];
  const cryptoStatus = deriveStatus({
    connected: coinbaseUsable,
    value: num(cryptoRow?.valueUsd ?? null),
    asOf: cryptoRow?.asOf ?? null,
    failed: !!cryptoRow?.lastErrorClass && cryptoRow?.asOf === null,
    policy: FRESHNESS.crypto,
    now,
  });
  classes.crypto = reading(num(cryptoRow?.valueUsd ?? null), cryptoRow?.asOf ?? null, cryptoStatus);

  // --- DeFi (Zerion, cached) -------------------------------------------------
  const zerionRows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));
  const defiRow = classCache.get('defi');
  const defiStatus = deriveStatus({
    connected: zerionRows.length > 0,
    value: num(defiRow?.valueUsd ?? null),
    asOf: defiRow?.asOf ?? null,
    failed: !!defiRow?.lastErrorClass && defiRow?.asOf === null,
    policy: FRESHNESS.defi,
    now,
  });
  classes.defi = reading(num(defiRow?.valueUsd ?? null), defiRow?.asOf ?? null, defiStatus);

  // --- Debts (Spinwheel, cached) ---------------------------------------------
  const [spinwheelRow] = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, userId));
  const debtsRow = classCache.get('debts');
  const debtsPayload = debtsRow?.payload as { items?: DebtItem[]; debts?: SpinwheelDebt[] } | null;
  const debtItems = (debtsPayload?.items ?? []) as DebtItem[];
  const debtsStatus = deriveStatus({
    connected: !!spinwheelRow,
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
  const chainRows = await db().select().from(chainWallets).where(eq(chainWallets.userId, userId));
  classes.chainWallets = rollupRows(
    chainRows.map((r): SimpleRow => ({ valueUsd: num(r.lastBalanceUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.chainWallets,
    now,
  );

  const hlRows = await db().select().from(hyperliquidAccounts).where(eq(hyperliquidAccounts.userId, userId));
  classes.hyperliquid = rollupRows(
    hlRows.map((r): SimpleRow => ({ valueUsd: num(r.lastAccountValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.hyperliquid,
    now,
  );

  const pmRows = await db().select().from(polymarketAccounts).where(eq(polymarketAccounts.userId, userId));
  classes.polymarket = rollupRows(
    pmRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.polymarket,
    now,
  );

  const reRows = await db().select().from(realEstateAssets).where(eq(realEstateAssets.userId, userId));
  classes.realEstate = rollupRows(
    reRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.realEstate,
    now,
  );

  const vehRows = await db().select().from(vehicleAssets).where(eq(vehicleAssets.userId, userId));
  classes.vehicles = rollupRows(
    vehRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.vehicles,
    now,
  );

  const metalRows = await db().select().from(metalHoldings).where(eq(metalHoldings.userId, userId));
  classes.metals = rollupRows(
    metalRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.metals,
    now,
  );

  const sneakerRows = await db().select().from(sneakerHoldings).where(eq(sneakerHoldings.userId, userId));
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

  const nftRows = await db().select().from(nftWallets).where(eq(nftWallets.userId, userId));
  classes.nft = rollupRows(
    nftRows.map((r): SimpleRow => ({ valueUsd: num(r.lastValueUsd), syncedAt: r.lastSyncedAt })),
    FRESHNESS.nft,
    now,
  );

  // Manual assets are self-reported: always labelled, never stale, never
  // excluded (prd.md R-8.2). asOf is the OLDEST declaration so age is honest.
  const manualRows = await db().select().from(manualAssets).where(eq(manualAssets.userId, userId));
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

  const pokemonRows = await db().select().from(pokemonCardHoldings).where(eq(pokemonCardHoldings.userId, userId));
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

  const [ynabRow] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
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

  const [krakenRow] = await db().select().from(krakenConnections).where(eq(krakenConnections.userId, userId));
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

  const [alpacaRow] = await db().select().from(alpacaConnections).where(eq(alpacaConnections.userId, userId));
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
  const [discogsRow] = await db().select().from(discogsConnections).where(eq(discogsConnections.userId, userId));
  classes.vinyl = discogsRow ? reading(0, null, 'ok') : reading(null, null, 'not_connected');

  const [kalshiRow] = await db().select().from(kalshiConnections).where(eq(kalshiConnections.userId, userId));
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

  const energyRows = await db().select().from(energyPositions).where(eq(energyPositions.userId, userId));
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

  const farmRows = await db().select().from(farmlandParcels).where(eq(farmlandParcels.userId, userId));
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

  const tcRows = await db().select().from(tradingCardHoldings).where(eq(tradingCardHoldings.userId, userId));
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

  const coinRows = await db().select().from(coinHoldings).where(eq(coinHoldings.userId, userId));
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

  const [tlRow] = await db().select().from(truelayerConnections).where(eq(truelayerConnections.userId, userId));
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
      defi: { totalUSD: scalar('defi') },
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
