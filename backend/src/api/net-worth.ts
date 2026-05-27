import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { getAccounts, getSpotPrices } from '../coinbase/client.js';
import { db } from '../db/client.js';
import {
  chainWallets,
  coinbaseConnections,
  hyperliquidAccounts,
  krakenConnections,
  metalHoldings,
  petState,
  realEstateAssets,
  snaptradeConnections,
  sneakerHoldings,
  spinwheelConnections,
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
            bankTotal -= balance;
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
      if (connection) {
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

    // --- SnapTrade brokerage (pre-synced total) ---
    let snaptradeTotal = 0;
    let snaptradeConnected = false;
    try {
      const [snap] = await db().select().from(snaptradeConnections).where(eq(snaptradeConnections.userId, userId));
      if (snap) {
        snaptradeConnected = true;
        if (snap.lastBrokerageTotal !== null) snaptradeTotal += parseFloat(snap.lastBrokerageTotal);
      }
    } catch {
      // table not yet populated
    }

    // --- Debts (Spinwheel) ---
    let debtsTotal = 0;
    const debtItems: Array<{ id: string; type: string; balance: number; monthlyPayment: number }> = [];
    let spinwheelConnected = false;
    try {
      const [connection] = await db()
        .select()
        .from(spinwheelConnections)
        .where(eq(spinwheelConnections.userId, userId));
      if (connection) {
        spinwheelConnected = true;
        const debts = await getDebtProfile(connection.spinwheelUserId);
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

    const total =
      bankTotal +
      investmentsTotal +
      cryptoTotal +
      defiTotal +
      chainWalletsTotal +
      hyperliquidTotal +
      krakenTotal +
      realEstateTotal +
      vehiclesTotal +
      metalsTotal +
      sneakersTotal +
      snaptradeTotal +
      ynabTotal -
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
      realEstate: realEstateTotal,
      vehicles: vehiclesTotal,
      metals: metalsTotal,
      sneakers: sneakersTotal,
      kraken: krakenTotal,
      snaptrade: snaptradeTotal,
      ynab: ynabTotal,
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
        kraken: krakenConnected,
        snaptrade: snaptradeConnected,
        spinwheel: spinwheelConnected,
        ynab: ynabConnected,
        zerion: zerionConnected,
      },
    };
  });
}
