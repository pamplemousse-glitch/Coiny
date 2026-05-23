import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { getAccounts } from '../coinbase/client.js';
import { getPrices } from '../coingecko/client.js';
import { db } from '../db/client.js';
import { coinbaseConnections, spinwheelConnections, zerionWallets } from '../db/schema.js';
import { accountsBalanceGet } from '../plaid/client.js';
import { getDebts } from '../spinwheel/client.js';
import { getItemsByUser } from '../store/items.js';
import { getPortfolio } from '../zerion/client.js';

// Incomplete — only the major coins for price enrichment.
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDC: 'usd-coin',
  USDT: 'tether',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  DOT: 'polkadot',
  ADA: 'cardano',
  LINK: 'chainlink',
};

export function registerNetWorthApi(app: FastifyInstance): void {
  app.get('/api/net-worth', async (req, _reply) => {
    const userId = req.user!.id;

    // --- Bank (Plaid) ---
    let bankTotal = 0;
    const bankAccounts: Array<{ accountId: string; name: string; type: string; balance: number }> = [];
    try {
      const items = await getItemsByUser(userId);
      const balanceResults = await Promise.allSettled(items.map((item) => accountsBalanceGet(item.accessToken)));
      for (const result of balanceResults) {
        if (result.status === 'rejected') continue;
        for (const acct of result.value.accounts) {
          // investment/brokerage excluded — handled by Plaid Investments product
          if (acct.type === 'investment' || acct.type === 'brokerage') continue;
          const balance = acct.balances.current ?? acct.balances.available ?? 0;
          if (acct.type === 'depository') {
            bankTotal += balance;
          } else if (acct.type === 'credit' || acct.type === 'loan') {
            bankTotal -= balance; // liabilities subtract from net worth
          }
          bankAccounts.push({ accountId: acct.account_id, name: acct.name, type: acct.type, balance });
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
        const symbols = accounts
          .map((a) => a.currency)
          .filter((s): s is string => typeof s === 'string' && s in SYMBOL_TO_COINGECKO_ID);
        const coinIds = [...new Set(symbols.map((s) => SYMBOL_TO_COINGECKO_ID[s]!))];
        const prices =
          coinIds.length > 0 ? await getPrices(coinIds) : new Map<string, { usd: number; change24h: number }>();

        for (const acct of accounts) {
          const amount = parseFloat(acct.balance.value);
          if (amount <= 0) continue;
          const coinId = SYMBOL_TO_COINGECKO_ID[acct.currency];
          const priceData = coinId ? prices.get(coinId) : undefined;
          const valueUSD = priceData ? amount * priceData.usd : 0;
          cryptoTotal += valueUSD;
          cryptoPositions.push({
            id: acct.account_id,
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
        const debts = await getDebts(connection.spinwheelUserId);
        for (const debt of debts) {
          debtsTotal += debt.balance;
          debtItems.push({
            id: debt.id,
            type: debt.type,
            balance: debt.balance,
            monthlyPayment: debt.minimumPayment,
          });
        }
      }
    } catch {
      // spinwheel not connected or error
    }

    const total = bankTotal + cryptoTotal + defiTotal - debtsTotal;

    return {
      total,
      bank: bankTotal,
      crypto: cryptoTotal,
      defi: defiTotal,
      debts: -debtsTotal,
      accounts: {
        bank: bankAccounts,
        crypto: cryptoPositions,
        defi: { totalUSD: defiTotal },
        debts: debtItems,
      },
      connections: {
        coinbase: coinbaseConnected,
        zerion: zerionConnected,
        spinwheel: spinwheelConnected,
      },
    };
  });
}
