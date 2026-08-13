import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { zerionWallets } from '../db/schema.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { evaluateExternalEvent } from '../reactions/external.js';
import { claimEvent } from '../store/events.js';
import { recordReaction } from '../store/pet.js';
import { getDeFiPositions, getPnl, getPortfolio, getTransactions } from '../zerion/client.js';

const AddWalletBodySchema = z.object({
  address: z.string().min(1).max(100),
  label: z.string().max(100).optional(),
});

export function registerZerionApi(app: FastifyInstance): void {
  // GET /api/zerion/wallets
  app.get('/api/zerion/wallets', async (req: FastifyRequest) => {
    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, req.user!.id));

    return rows.map((r) => ({
      id: r.id,
      address: r.address,
      label: r.label ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/zerion/wallets
  app.post('/api/zerion/wallets', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddWalletBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(zerionWallets)
      .values({ userId, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'zerion wallet added');
    return reply.status(201).send({ ok: true, address });
  });

  // DELETE /api/zerion/wallets/:address
  app.delete(
    '/api/zerion/wallets/:address',
    async (req: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
      const { address } = req.params;
      const userId = req.user!.id;

      await db()
        .delete(zerionWallets)
        .where(and(eq(zerionWallets.userId, userId), eq(zerionWallets.address, address)));

      req.log.info({ userId }, 'zerion wallet removed');
      return reply.status(204).send();
    },
  );

  // GET /api/zerion/portfolio
  app.get('/api/zerion/portfolio', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));

    if (rows.length === 0) return { total_usd: 0, wallets: [] };

    const portfolios = await Promise.allSettled(rows.map((r) => getPortfolio(r.address)));

    let total_usd = 0;
    const wallets: Array<{ address: string; label: string | null; total_usd: number; change_1d_pct: number | null }> =
      [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = portfolios[i];
      if (!row) continue;
      if (result?.status === 'fulfilled') {
        total_usd += result.value.total_usd;
        wallets.push({
          address: row.address,
          label: row.label ?? null,
          total_usd: result.value.total_usd,
          change_1d_pct: result.value.change_1d_pct ?? null,
        });
      } else {
        wallets.push({ address: row.address, label: row.label ?? null, total_usd: 0, change_1d_pct: null });
      }
    }

    return { total_usd, wallets };
  });

  // GET /api/zerion/pnl
  app.get('/api/zerion/pnl', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));

    if (rows.length === 0) {
      return { unrealizedGain: 0, realizedGain: 0, totalGain: 0, wallets: [] };
    }

    const results = await Promise.allSettled(rows.map((r) => getPnl(r.address)));

    let unrealizedGain = 0;
    let realizedGain = 0;
    let totalGain = 0;
    const wallets: Array<{
      address: string;
      label: string | null;
      unrealizedGain: number;
      realizedGain: number;
      totalGain: number;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = results[i];
      if (!row) continue;

      if (result?.status === 'fulfilled') {
        const pnl = result.value;
        const wUnrealized = pnl.unrealized_gain ?? 0;
        const wRealized = pnl.realized_gain ?? 0;
        const wTotal = pnl.total_gain ?? 0;
        unrealizedGain += wUnrealized;
        realizedGain += wRealized;
        totalGain += wTotal;
        wallets.push({
          address: row.address,
          label: row.label ?? null,
          unrealizedGain: wUnrealized,
          realizedGain: wRealized,
          totalGain: wTotal,
        });
      } else {
        wallets.push({
          address: row.address,
          label: row.label ?? null,
          unrealizedGain: 0,
          realizedGain: 0,
          totalGain: 0,
        });
      }
    }

    return { unrealizedGain, realizedGain, totalGain, wallets };
  });

  // GET /api/zerion/defi-positions
  app.get('/api/zerion/defi-positions', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));

    if (rows.length === 0) {
      return { positions: [] };
    }

    const results = await Promise.allSettled(rows.map((r) => getDeFiPositions(r.address)));

    const positions: Array<{
      id: string;
      symbol: string;
      name: string;
      quantity: number;
      valueUsd: number;
      walletAddress: string;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = results[i];
      if (!row) continue;

      if (result?.status === 'fulfilled') {
        for (const pos of result.value) {
          positions.push({
            id: pos.id,
            symbol: pos.symbol,
            name: pos.name,
            quantity: pos.quantity,
            valueUsd: pos.value_usd,
            walletAddress: row.address,
          });
        }
      }
    }

    return { positions };
  });

  // POST /api/zerion/sync
  app.post('/api/zerion/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));

    if (rows.length === 0) return { reacted: 0 };

    let reacted = 0;

    for (const row of rows) {
      // Paginate up to 5 pages (500 txns) per wallet; pass sync=true on first fetch for fresh data.
      let cursor: string | undefined;
      let pagesLeft = 5;
      do {
        const page = await getTransactions(row.address, cursor, { sync: !cursor });
        cursor = page.nextCursor;
        pagesLeft--;

        for (const tx of page.transactions) {
          const eventId = `zerion:${tx.id}`;
          const claimed = await claimEvent(eventId);
          if (!claimed) continue;

          let eventType: import('../reactions/external.js').ExternalEventType | null = null;
          const opType = tx.type.toLowerCase();
          const isInbound = tx.direction === 'in';

          if (opType === 'trade' && isInbound) {
            eventType = 'defi_yield';
          } else if (isInbound || opType === 'receive' || opType === 'deposit') {
            eventType = 'wallet_receive';
          }

          if (!eventType) continue;

          const amountUsd = tx.quantity_usd > 0 ? tx.quantity_usd : null;
          const symbol = tx.asset_symbol || null;

          const reaction = evaluateExternalEvent({
            id: eventId,
            userId,
            type: eventType,
            ...(amountUsd !== null ? { amountUsd } : {}),
            ...(symbol !== null ? { symbol } : {}),
            source: 'zerion',
          });

          if (reaction) {
            dispatchReaction(userId, reaction, eventType);
            await recordReaction(userId, eventType, reaction);
            reacted++;
          }
        }
      } while (cursor && pagesLeft > 0);
    }

    req.log.info({ userId, reacted }, 'zerion sync complete');
    return { reacted };
  });
}
