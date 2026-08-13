import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { getAccounts, getSpotPrices } from '../coinbase/client.js';
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
  petState,
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
import { accountsBalanceGet, investmentsHoldingsGet, liabilitiesGet } from '../plaid/client.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { evaluateExternalEvent } from '../reactions/external.js';
import { getDebtProfile } from '../spinwheel/client.js';
import { getItemsByUser } from '../store/items.js';
import { recordReaction } from '../store/pet.js';
import { getCachedLiabilities } from '../store/plaid-liabilities.js';
import { getRecentOutflows } from '../store/transactions.js';
import { getPortfolio } from '../zerion/client.js';

const NET_WORTH_MILESTONES = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

function crossedMilestone(prev: number, current: number): number | null {
  for (let i = NET_WORTH_MILESTONES.length - 1; i >= 0; i--) {
    const m = NET_WORTH_MILESTONES[i]!;
    if (prev < m && current >= m) return m;
  }
  return null;
}

export function registerNetWorthApi(app: FastifyInstance): void {
  app.get('/api/net-worth', async (req, _reply) => {
    const userId = req.user!.id;

    // --- Bank, Investments, Liabilities (Plaid) ---
    let bankTotal = 0;
    let plaidDebtTotal = 0;
    let liquidDeposits = 0;
    let investmentsTotal = 0;
    const bankAccounts: Array<{
      accountId: string;
      name: string;
      type: string;
      balance: number;
      minPayment: number | null;
      nextDueDate: string | null;
      isOverdue: boolean | null;
      primaryApr: number | null;
    }> = [];
    const investmentHoldings: Array<{
      securityId: string;
      name: string | null;
      ticker: string | null;
      value: number;
    }> = [];

    try {
      const items = await getItemsByUser(userId);

      // Fetch balances and investment holdings in parallel; liabilities read from cache.
      const [balanceResults, holdingsResults] = await Promise.all([
        Promise.allSettled(items.map((item) => accountsBalanceGet(item.accessToken))),
        Promise.allSettled(items.map((item) => investmentsHoldingsGet(item.accessToken))),
      ]);

      // Build liability payment metadata map from cache; fall back to live API if cache is empty.
      type LiabilityMeta = {
        minPayment: number | null;
        nextDueDate: string | null;
        isOverdue: boolean | null;
        primaryApr: number | null;
      };
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
        // Cache empty — fall back to live Plaid calls.
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

      // Bank balances — depository adds, credit/loan subtracts; investment/brokerage excluded
      for (const result of balanceResults) {
        if (result.status === 'rejected') continue;
        for (const acct of result.value.accounts) {
          if (acct.type === 'investment' || acct.type === 'brokerage') continue;
          const balance = acct.balances.current ?? acct.balances.available ?? 0;
          if (acct.type === 'depository') {
            bankTotal += balance;
            liquidDeposits += Math.max(0, balance);
          } else if (acct.type === 'credit' || acct.type === 'loan') {
            // Accumulated separately, NOT subtracted here. Spinwheel pulls the
            // same cards and loans from the credit bureau, so subtracting both
            // double-counts the debt. Reconciled once below, after we know
            // whether Spinwheel is connected.
            plaidDebtTotal += balance;
          }
          const meta = liabilityMeta.get(acct.account_id);
          bankAccounts.push({
            accountId: acct.account_id,
            name: acct.name,
            type: acct.type,
            balance,
            minPayment: meta?.minPayment ?? null,
            nextDueDate: meta?.nextDueDate ?? null,
            isOverdue: meta?.isOverdue ?? null,
            primaryApr: meta?.primaryApr ?? null,
          });
        }
      }

      // Investment holdings — sum institution_value across all securities
      for (const result of holdingsResults) {
        if (result.status === 'rejected') continue;
        const secMap = new Map(result.value.securities.map((s) => [s.security_id, s]));
        for (const h of result.value.holdings) {
          const value = h.institution_value ?? 0;
          investmentsTotal += value;
          const sec = secMap.get(h.security_id);
          investmentHoldings.push({
            securityId: h.security_id,
            name: sec?.name ?? null,
            ticker: sec?.ticker_symbol ?? null,
            value,
          });
        }
      }
    } catch {
      // no bank linked
    }

    // --- Crypto (Coinbase) ---
    let cryptoTotal = 0;
    const cryptoPositions: Array<{ id: string; name: string; symbol: string; amount: number; valueUSD: number }> = [];
    let coinbaseConnected = false;
    try {
      const [connection] = await db().select().from(coinbaseConnections).where(eq(coinbaseConnections.userId, userId));
      // A 'dev_key' connection means "sign with the operator's shared key", not
      // per-user credentials. Serving that in production would count the
      // operator's balances as this user's. See isSharedCoinbaseKeyAllowed.
      if (connection && (connection.mode !== 'dev_key' || isSharedCoinbaseKeyAllowed())) {
        coinbaseConnected = true;
        const accounts = await getAccounts();
        const symbols = accounts.map((a) => a.currency).filter((s): s is string => typeof s === 'string');
        const prices = symbols.length > 0 ? await getSpotPrices(symbols) : new Map<string, number>();

        for (const acct of accounts) {
          const amount = parseFloat(acct.available_balance.value);
          if (amount <= 0) continue;
          const usd = prices.get(acct.currency);
          const valueUSD = usd ? amount * usd : 0;
          cryptoTotal += valueUSD;
          cryptoPositions.push({
            id: acct.uuid,
            name: acct.currency,
            symbol: acct.currency,
            amount,
            valueUSD,
          });
        }
      }
    } catch {
      // coinbase not connected or error
    }

    // --- DeFi (Zerion) ---
    let defiTotal = 0;
    let zerionConnected = false;
    try {
      const wallets = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));
      if (wallets.length > 0) {
        zerionConnected = true;
        for (const wallet of wallets) {
          try {
            const portfolio = await getPortfolio(wallet.address);
            defiTotal += portfolio.total_usd;
          } catch {
            // skip failing wallet
          }
        }
      }
    } catch {
      // zerion not connected
    }

    // --- Other chains (chain_wallets — pre-synced balances) ---
    let chainWalletsTotal = 0;
    try {
      const walletRows = await db().select().from(chainWallets).where(eq(chainWallets.userId, userId));
      for (const w of walletRows) {
        if (w.lastBalanceUsd !== null) chainWalletsTotal += parseFloat(w.lastBalanceUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Hyperliquid perp accounts (pre-synced account values) ---
    let hyperliquidTotal = 0;
    try {
      const hlRows = await db().select().from(hyperliquidAccounts).where(eq(hyperliquidAccounts.userId, userId));
      for (const r of hlRows) {
        if (r.lastAccountValueUsd !== null) hyperliquidTotal += parseFloat(r.lastAccountValueUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Polymarket prediction market positions (pre-synced values) ---
    let polymarketTotal = 0;
    try {
      const pmRows = await db().select().from(polymarketAccounts).where(eq(polymarketAccounts.userId, userId));
      for (const r of pmRows) {
        if (r.lastValueUsd !== null) polymarketTotal += parseFloat(r.lastValueUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Real estate ---
    let realEstateTotal = 0;
    try {
      const rows = await db().select().from(realEstateAssets).where(eq(realEstateAssets.userId, userId));
      for (const r of rows) {
        if (r.lastValueUsd !== null) realEstateTotal += parseFloat(r.lastValueUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Vehicles ---
    let vehiclesTotal = 0;
    try {
      const rows = await db().select().from(vehicleAssets).where(eq(vehicleAssets.userId, userId));
      for (const r of rows) {
        if (r.lastValueUsd !== null) vehiclesTotal += parseFloat(r.lastValueUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Metals ---
    let metalsTotal = 0;
    try {
      const rows = await db().select().from(metalHoldings).where(eq(metalHoldings.userId, userId));
      for (const r of rows) {
        if (r.lastValueUsd !== null) metalsTotal += parseFloat(r.lastValueUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Sneakers (KicksDB-priced) ---
    let sneakersTotal = 0;
    try {
      const rows = await db().select().from(sneakerHoldings).where(eq(sneakerHoldings.userId, userId));
      for (const r of rows) {
        if (r.lastPriceUsd !== null) sneakersTotal += parseFloat(r.lastPriceUsd) * r.quantity;
      }
    } catch {
      // table not yet populated
    }

    // --- NFT wallets (Alchemy — pre-synced floor-price values) ---
    let nftTotal = 0;
    try {
      const rows = await db().select().from(nftWallets).where(eq(nftWallets.userId, userId));
      for (const r of rows) {
        if (r.lastValueUsd !== null) nftTotal += parseFloat(r.lastValueUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Manual assets (self-reported values) ---
    let manualTotal = 0;
    try {
      const rows = await db().select().from(manualAssets).where(eq(manualAssets.userId, userId));
      for (const r of rows) {
        manualTotal += parseFloat(r.selfReportedValueUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Pokémon cards (PokemonPriceTracker-priced) ---
    let pokemonCardsTotal = 0;
    try {
      const rows = await db().select().from(pokemonCardHoldings).where(eq(pokemonCardHoldings.userId, userId));
      for (const r of rows) {
        if (r.lastPriceUsd !== null) pokemonCardsTotal += parseFloat(r.lastPriceUsd) * r.quantity;
      }
    } catch {
      // table not yet populated
    }

    // --- YNAB budgets (pre-synced total) ---
    let ynabTotal = 0;
    let ynabConnected = false;
    try {
      const [ynab] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
      if (ynab) {
        ynabConnected = true;
        if (ynab.lastNetWorthUsd !== null) ynabTotal += parseFloat(ynab.lastNetWorthUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Kraken CEX (pre-synced total) ---
    let krakenTotal = 0;
    let krakenConnected = false;
    try {
      const [kraken] = await db().select().from(krakenConnections).where(eq(krakenConnections.userId, userId));
      if (kraken) {
        krakenConnected = true;
        if (kraken.lastTotalUsd !== null) krakenTotal += parseFloat(kraken.lastTotalUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Alpaca brokerage (pre-synced equity) ---
    let alpacaTotal = 0;
    let alpacaConnected = false;
    try {
      const [alpaca] = await db().select().from(alpacaConnections).where(eq(alpacaConnections.userId, userId));
      if (alpaca) {
        alpacaConnected = true;
        if (alpaca.lastEquityUsd !== null) alpacaTotal += parseFloat(alpaca.lastEquityUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Vinyl collection (Discogs) ---
    //
    // R-7 / R-17.3, register row DR-10: Discogs marketplace price data is
    // "Restricted Data" under their API terms and may not be used for any
    // commercial purpose without written permission. Permission has been
    // requested and is not granted, so no Discogs-derived value is served:
    // vinylTotal stays 0 and is excluded from the total.
    //
    // The connection flag is still reported so the UI can show the account as
    // linked and explain why no value appears. The sync endpoint still writes
    // lastCollectionUsd, which is retained but not displayed; re-enabling is a
    // one-line change here PLUS both attribution strings and the six-hour
    // display-staleness rule, which needs the scheduler. Do not re-enable
    // without all three.
    const vinylTotal = 0;
    let discogsConnected = false;
    try {
      const [discogs] = await db().select().from(discogsConnections).where(eq(discogsConnections.userId, userId));
      if (discogs) {
        discogsConnected = true;
      }
    } catch {
      // table not yet populated
    }

    // --- Prediction markets (Kalshi) ---
    let kalshiTotal = 0;
    let kalshiConnected = false;
    try {
      const [kalshi] = await db().select().from(kalshiConnections).where(eq(kalshiConnections.userId, userId));
      if (kalshi) {
        kalshiConnected = true;
        if (kalshi.lastPortfolioUsd !== null) kalshiTotal += parseFloat(kalshi.lastPortfolioUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Energy commodities (EIA spot prices, pre-synced) ---
    let energyTotal = 0;
    try {
      const rows = await db().select().from(energyPositions).where(eq(energyPositions.userId, userId));
      for (const r of rows) {
        if (r.lastSpotPriceUsd !== null) energyTotal += parseFloat(r.quantity) * parseFloat(r.lastSpotPriceUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Farmland parcels (USDA NASS land value, pre-synced) ---
    let farmlandTotal = 0;
    try {
      const rows = await db().select().from(farmlandParcels).where(eq(farmlandParcels.userId, userId));
      for (const r of rows) {
        if (r.lastPricePerAcreUsd !== null) farmlandTotal += parseFloat(r.acres) * parseFloat(r.lastPricePerAcreUsd);
      }
    } catch {
      // table not yet populated
    }

    // --- Trading cards (TCGapi market prices, pre-synced) ---
    let tradingCardsTotal = 0;
    try {
      const rows = await db().select().from(tradingCardHoldings).where(eq(tradingCardHoldings.userId, userId));
      for (const r of rows) {
        if (r.lastPriceUsd !== null) tradingCardsTotal += parseFloat(r.lastPriceUsd) * r.quantity;
      }
    } catch {
      // table not yet populated
    }

    // --- Graded coins (PCGS price guide, pre-synced) ---
    let coinsTotal = 0;
    try {
      const rows = await db().select().from(coinHoldings).where(eq(coinHoldings.userId, userId));
      for (const r of rows) {
        if (r.lastPriceGuideUsd !== null) coinsTotal += parseFloat(r.lastPriceGuideUsd) * r.quantity;
      }
    } catch {
      // table not yet populated
    }

    // --- TrueLayer Open Banking (UK/EU banks — pre-synced, already USD-converted) ---
    let truelayerTotal = 0;
    let truelayerConnected = false;
    try {
      const [tl] = await db().select().from(truelayerConnections).where(eq(truelayerConnections.userId, userId));
      if (tl) {
        truelayerConnected = true;
        // lastBalanceGbp stores USD post-conversion (Frankfurter FX applied at sync time)
        if (tl.lastBalanceGbp !== null) truelayerTotal += parseFloat(tl.lastBalanceGbp);
      }
    } catch {
      // table not yet populated
    }

    // --- Debts (Spinwheel) ---
    let debtsTotal = 0;
    const debtItems: Array<{ id: string; type: string; balance: number; monthlyPayment: number }> = [];
    let spinwheelConnected = false;
    // Distinct from spinwheelConnected: set only after the bureau fetch actually
    // returns. If Spinwheel is connected but its fetch throws, debtsTotal stays 0,
    // and suppressing the Plaid subtraction on "connected" alone would make net
    // worth silently jump by the full card and loan balances.
    let spinwheelDebtsLoaded = false;
    try {
      const [connection] = await db()
        .select()
        .from(spinwheelConnections)
        .where(eq(spinwheelConnections.userId, userId));
      if (connection) {
        spinwheelConnected = true;
        const debts = await getDebtProfile(connection.spinwheelUserId);
        spinwheelDebtsLoaded = true;
        for (const debt of debts) {
          debtsTotal += debt.balance ?? 0;
          debtItems.push({
            id: debt.id,
            type: debt.type,
            balance: debt.balance ?? 0,
            monthlyPayment: debt.minimumPayment ?? 0,
          });
        }
      }
    } catch {
      // spinwheel not connected or error
    }

    // Reconcile the two debt sources. Spinwheel reads the credit bureau and
    // Plaid reads the institution, so a user connected to both sees the same
    // card twice. Prefer the bureau when available (broader: it catches
    // accounts at institutions the user has not linked), otherwise fall back to
    // the Plaid-visible liabilities. Never subtract both.
    if (!spinwheelDebtsLoaded) {
      bankTotal -= plaidDebtTotal;
    }

    const total =
      bankTotal +
      investmentsTotal +
      cryptoTotal +
      defiTotal +
      chainWalletsTotal +
      hyperliquidTotal +
      polymarketTotal +
      krakenTotal +
      alpacaTotal +
      realEstateTotal +
      vehiclesTotal +
      metalsTotal +
      sneakersTotal +
      nftTotal +
      manualTotal +
      ynabTotal +
      vinylTotal +
      kalshiTotal +
      truelayerTotal +
      pokemonCardsTotal +
      energyTotal +
      farmlandTotal +
      tradingCardsTotal +
      coinsTotal -
      debtsTotal;

    // --- Net worth milestone reaction ---
    try {
      const [pet] = await db().select().from(petState).where(eq(petState.userId, userId));
      const prev =
        pet?.lastNetWorthUsd !== null && pet?.lastNetWorthUsd !== undefined ? parseFloat(pet.lastNetWorthUsd) : null;
      const milestone = prev !== null ? crossedMilestone(prev, total) : null;
      if (milestone !== null) {
        const reaction = evaluateExternalEvent({
          id: `nw-milestone-${userId}-${milestone}`,
          userId,
          type: 'net_worth_milestone',
          amountUsd: milestone,
          source: 'zerion',
        });
        if (reaction) {
          await recordReaction(userId, 'net_worth_milestone', reaction);
          dispatchReaction(userId, reaction);
        }
      }
      if (prev === null || Math.abs(total - prev) > 0.01) {
        await db().update(petState).set({ lastNetWorthUsd: total.toString() }).where(eq(petState.userId, userId));
      }
    } catch {
      // pet row may not exist yet; skip milestone check
    }

    // --- Emergency fund coverage (C4) ---
    let liquidCashMonths: number | null = null;
    try {
      const outflows90 = await getRecentOutflows(userId, 90);
      const totalOutflows90 = outflows90.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
      const avgMonthlyBurn = totalOutflows90 / 3;
      if (avgMonthlyBurn > 0 && liquidDeposits > 0) {
        liquidCashMonths = Math.round((liquidDeposits / avgMonthlyBurn) * 10) / 10;
      }
    } catch {
      // no transactions yet
    }

    return {
      total,
      bank: bankTotal,
      investments: investmentsTotal,
      crypto: cryptoTotal,
      defi: defiTotal,
      chainWallets: chainWalletsTotal,
      hyperliquid: hyperliquidTotal,
      polymarket: polymarketTotal,
      realEstate: realEstateTotal,
      vehicles: vehiclesTotal,
      metals: metalsTotal,
      sneakers: sneakersTotal,
      nft: nftTotal,
      manual: manualTotal,
      pokemonCards: pokemonCardsTotal,
      kalshi: kalshiTotal,
      kraken: krakenTotal,
      alpaca: alpacaTotal,
      ynab: ynabTotal,
      vinyl: vinylTotal,
      truelayer: truelayerTotal,
      energy: energyTotal,
      farmland: farmlandTotal,
      tradingCards: tradingCardsTotal,
      coins: coinsTotal,
      debts: -debtsTotal,
      liquidCashMonths,
      accounts: {
        bank: bankAccounts,
        investments: investmentHoldings,
        crypto: cryptoPositions,
        defi: { totalUSD: defiTotal },
        debts: debtItems,
      },
      connections: {
        coinbase: coinbaseConnected,
        discogs: discogsConnected,
        kalshi: kalshiConnected,
        kraken: krakenConnected,
        alpaca: alpacaConnected,
        spinwheel: spinwheelConnected,
        truelayer: truelayerConnected,
        ynab: ynabConnected,
        zerion: zerionConnected,
      },
    };
  });
}
