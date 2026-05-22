import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getAccounts, getTransactions } from '../coinbase/client.js';
import { getPrices } from '../coingecko/client.js';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { coinbaseConnections } from '../db/schema.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { evaluateExternalEvent } from '../reactions/external.js';
import { claimEvent } from '../store/events.js';
import { recordReaction } from '../store/pet.js';

// Mapping from Coinbase currency symbol to CoinGecko coin ID.
// Incomplete by design — we only need the major coins for price enrichment.
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

export function registerCoinbaseApi(app: FastifyInstance): void {
  // GET /api/coinbase/status
  app.get('/api/coinbase/status', async (req: FastifyRequest) => {
    const rows = await db().select().from(coinbaseConnections).where(eq(coinbaseConnections.userId, req.user!.id));
    const row = rows[0];
    if (!row) return { connected: false, mode: null };
    return { connected: true, mode: row.mode as 'dev_key' | 'oauth' };
  });

  // POST /api/coinbase/connect/dev-key
  app.post('/api/coinbase/connect/dev-key', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!config.COINBASE_API_KEY_ID) {
      return reply.status(409).send({ error: 'COINBASE_API_KEY_ID is not configured on this server' });
    }

    await db()
      .insert(coinbaseConnections)
      .values({ userId: req.user!.id, mode: 'dev_key' })
      .onConflictDoUpdate({
        target: coinbaseConnections.userId,
        set: { mode: 'dev_key', accessToken: null, refreshToken: null, tokenExpiresAt: null },
      });

    req.log.info({ userId: req.user!.id }, 'coinbase dev-key connection created');
    return { ok: true };
  });

  // DELETE /api/coinbase/connect
  app.delete('/api/coinbase/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    await db().delete(coinbaseConnections).where(eq(coinbaseConnections.userId, req.user!.id));
    req.log.info({ userId: req.user!.id }, 'coinbase connection removed');
    return reply.status(204).send();
  });

  // POST /api/coinbase/sync
  app.post('/api/coinbase/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;

    const rows = await db().select().from(coinbaseConnections).where(eq(coinbaseConnections.userId, userId));
    if (!rows[0]) {
      return reply.status(409).send({ error: 'No Coinbase connection found. Connect first.' });
    }

    const accounts = await getAccounts();
    if (accounts.length === 0) {
      return { reacted: 0 };
    }

    // Collect all transactions across accounts (first page only per account).
    type TxWithCurrency = { tx: Awaited<ReturnType<typeof getTransactions>>['transactions'][number]; currency: string };
    const allTxs: TxWithCurrency[] = [];
    for (const account of accounts) {
      const { transactions } = await getTransactions(account.account_id);
      for (const tx of transactions) {
        allTxs.push({ tx, currency: account.currency });
      }
    }

    // Fetch price data for unique currencies.
    const currencies = [...new Set(allTxs.map((t) => t.currency))];
    const coinIds = currencies.flatMap((sym) => {
      const id = SYMBOL_TO_COINGECKO_ID[sym];
      return id ? [id] : [];
    });

    let prices = new Map<string, { usd: number; change24h: number }>();
    try {
      prices = await getPrices(coinIds);
    } catch (err) {
      // Non-fatal — proceed without price enrichment.
      req.log.warn({ err }, 'coingecko price fetch failed during coinbase sync');
    }

    let reacted = 0;
    for (const { tx, currency } of allTxs) {
      const eventId = `coinbase:${tx.id}`;
      const claimed = await claimEvent(eventId);
      if (!claimed) continue;

      const coinId = SYMBOL_TO_COINGECKO_ID[currency];
      const priceData = coinId ? prices.get(coinId) : undefined;
      const amountNum = Math.abs(Number.parseFloat(tx.amount.amount));
      const amountUsd = priceData ? amountNum * priceData.usd : undefined;

      // Determine event type from transaction type and direction.
      let eventType: import('../reactions/external.js').ExternalEventType | null = null;
      const txType = tx.type.toLowerCase();
      const amount = Number.parseFloat(tx.amount.amount);

      if (txType === 'receive' || (txType === 'transfer' && amount > 0)) {
        eventType = 'crypto_received';
      } else if (txType === 'send' || (txType === 'transfer' && amount < 0)) {
        eventType = 'crypto_sent';
      } else if (txType === 'buy') {
        eventType = 'crypto_received';
      }

      if (!eventType) continue;

      // Also check price surge/drop if we have price data.
      if (priceData && Math.abs(priceData.change24h) >= 10) {
        const priceEventId = `coinbase:price:${currency}:${new Date().toISOString().slice(0, 10)}`;
        const priceClaimed = await claimEvent(priceEventId);
        if (priceClaimed) {
          const priceEventType: import('../reactions/external.js').ExternalEventType =
            priceData.change24h >= 10 ? 'crypto_price_surge' : 'crypto_price_drop';
          const priceReaction = evaluateExternalEvent({
            id: priceEventId,
            userId,
            type: priceEventType,
            symbol: currency,
            source: 'coinbase',
          });
          if (priceReaction) {
            dispatchReaction(userId, priceReaction);
            await recordReaction(userId, priceEventType, priceReaction);
            reacted++;
          }
        }
      }

      const reaction = evaluateExternalEvent({
        id: eventId,
        userId,
        type: eventType,
        ...(amountUsd !== undefined ? { amountUsd } : {}),
        symbol: currency,
        source: 'coinbase',
      });

      if (reaction) {
        dispatchReaction(userId, reaction);
        await recordReaction(userId, eventType, reaction);
        reacted++;
      }
    }

    req.log.info({ userId, reacted }, 'coinbase sync complete');
    return { reacted };
  });
}
