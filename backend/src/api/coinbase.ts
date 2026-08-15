import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getAccounts, getPortfolioSummary, getSpotPrices, getTransactions } from '../coinbase/client.js';
import { config, isSharedCoinbaseKeyAllowed } from '../config.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { evaluateExternalEvent } from '../reactions/external.js';
import { deleteCoinbaseConnection, getCoinbaseConnection, upsertCoinbaseDevKey } from '../store/coinbase.js';
import { claimEvent } from '../store/events.js';
import { recordReaction } from '../store/pet.js';

export function registerCoinbaseApi(app: FastifyInstance): void {
  // GET /api/coinbase/performance
  app.get('/api/coinbase/performance', async (req: FastifyRequest) => {
    const empty = { unrealizedPnl: null, totalCash: null, totalCrypto: null };
    // Previously this ignored the caller entirely and signed with the server's
    // shared key, so any authenticated user received the OPERATOR's P&L.
    const conn = await getCoinbaseConnection(req.user!.id);
    if (!conn) return empty;
    if (conn.mode === 'dev_key' && !isSharedCoinbaseKeyAllowed()) return empty;

    try {
      const summary = await getPortfolioSummary();
      if (!summary) {
        return empty;
      }
      return {
        unrealizedPnl: summary.unrealizedPnl,
        totalCash: summary.totalCash,
        totalCrypto: summary.totalCrypto,
      };
    } catch {
      return empty;
    }
  });

  // GET /api/coinbase/status
  app.get('/api/coinbase/status', async (req: FastifyRequest) => {
    const conn = await getCoinbaseConnection(req.user!.id);
    if (!conn) return { connected: false, mode: null };
    return { connected: true, mode: conn.mode as 'dev_key' | 'oauth' };
  });

  // POST /api/coinbase/connect/dev-key
  app.post('/api/coinbase/connect/dev-key', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!config.COINBASE_API_KEY_ID) {
      return reply.status(409).send({ error: 'COINBASE_API_KEY_ID is not configured on this server' });
    }
    // dev-key mode signs with the operator's own Coinbase key. Offering it in a
    // multi-user deployment would attribute the operator's holdings to whoever
    // connects. Per-user Coinbase needs the unbuilt OAuth path.
    if (!isSharedCoinbaseKeyAllowed()) {
      return reply.status(409).send({ error: 'Coinbase dev-key mode is not available in this environment' });
    }

    await upsertCoinbaseDevKey(req.user!.id);
    req.log.info({ userId: req.user!.id }, 'coinbase dev-key connection created');
    return { ok: true };
  });

  // DELETE /api/coinbase/connect
  app.delete('/api/coinbase/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    await deleteCoinbaseConnection(req.user!.id);
    req.log.info({ userId: req.user!.id }, 'coinbase connection removed');
    return reply.status(204).send();
  });

  // POST /api/coinbase/sync
  app.post('/api/coinbase/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;

    const conn = await getCoinbaseConnection(userId);
    if (!conn) {
      return reply.status(409).send({ error: 'No Coinbase connection found. Connect first.' });
    }
    if (conn.mode === 'dev_key' && !isSharedCoinbaseKeyAllowed()) {
      return reply.status(409).send({ error: 'Coinbase dev-key mode is not available in this environment' });
    }

    const accounts = await getAccounts();
    if (accounts.length === 0) {
      return { reacted: 0 };
    }

    // Collect transactions across accounts; paginate up to 5 pages per account.
    type TxWithCurrency = { tx: Awaited<ReturnType<typeof getTransactions>>['transactions'][number]; currency: string };
    const allTxs: TxWithCurrency[] = [];
    for (const account of accounts) {
      let cursor: string | undefined;
      let pagesLeft = 5;
      do {
        const page = await getTransactions(account.uuid, cursor);
        cursor = page.nextCursor;
        pagesLeft--;
        for (const tx of page.transactions) {
          allTxs.push({ tx, currency: account.currency });
        }
      } while (cursor && pagesLeft > 0);
    }

    // Fetch spot prices for unique currencies — non-fatal if it fails.
    const currencies = [...new Set(allTxs.map((t) => t.currency))];
    let prices = new Map<string, number>();
    try {
      prices = await getSpotPrices(currencies);
    } catch (err) {
      req.log.warn({ err }, 'coinbase spot price fetch failed during sync');
    }

    let reacted = 0;
    for (const { tx, currency } of allTxs) {
      const eventId = `coinbase:${tx.id}`;
      const claimed = await claimEvent(eventId);
      if (!claimed) continue;

      const usd = prices.get(currency);
      const amountNum = Math.abs(Number.parseFloat(tx.amount.amount));
      const amountUsd = usd ? amountNum * usd : undefined;

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

      const reaction = evaluateExternalEvent({
        id: eventId,
        userId,
        type: eventType,
        ...(amountUsd !== undefined ? { amountUsd } : {}),
        symbol: currency,
        source: 'coinbase',
      });

      if (reaction) {
        dispatchReaction(userId, reaction, eventType);
        await recordReaction(userId, eventType, reaction);
        reacted++;
      }
    }

    req.log.info({ userId, reacted }, 'coinbase sync complete');
    return { reacted };
  });
}
