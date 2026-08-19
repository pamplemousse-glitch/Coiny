import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import { itemWebhookUpdate, sandboxItemFireWebhook } from '../plaid/client.js';
import { orderCandidates } from '../reactions/contract.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import type { Animation, Reaction } from '../reactions/types.js';
import { evaluateAll } from '../rules/engine.js';
import { clearUserEvents } from '../store/events.js';
import { getItemsByUser, resetCursor } from '../store/items.js';
import { getGoals, recordReaction } from '../store/pet.js';
import { createSession } from '../store/sessions.js';
import { getWeeklySpendByCategory } from '../store/transactions.js';
import { findOrCreateUser } from '../store/users.js';
import type { Transaction } from '../types/transaction.js';
import { decryptNullable } from '../util/crypto.js';

const DEBUG_PRESETS: Record<Animation, Omit<Reaction, 'reason'>> = {
  celebrate: { animation: 'celebrate', sound: 'fanfare', led: 'rainbow', duration: 3000 },
  happy: { animation: 'happy', sound: 'chime', led: 'green', duration: 2000 },
  sad: { animation: 'sad', sound: 'warning', led: 'red', duration: 2000 },
  concerned: { animation: 'concerned', sound: 'warning', led: 'amber', duration: 2000 },
  neutral: { animation: 'neutral', sound: 'off', led: 'off', duration: 1000 },
  sleeping: { animation: 'sleeping', sound: 'off', led: 'off', duration: 0 },
  curious: { animation: 'curious', sound: 'off', led: 'off', duration: 1500 },
};

const ReactQuerySchema = z.object({
  animation: z.enum(Object.keys(DEBUG_PRESETS) as [Animation, ...Animation[]]),
});

// Only registered when PLAID_ENV=sandbox — not callable in production.
export function registerDebugApi(app: FastifyInstance): void {
  app.post('/api/debug/fire-transaction', async (req: FastifyRequest, reply: FastifyReply) => {
    const items = await getItemsByUser(req.user!.id);
    const item = items[0];
    if (!item) {
      return reply.status(409).send({ error: 'No linked Plaid item — link a bank first.' });
    }
    if (config.PLAID_WEBHOOK_URL) {
      await itemWebhookUpdate({ access_token: item.accessToken, webhook: config.PLAID_WEBHOOK_URL });
    }
    const result = await sandboxItemFireWebhook({
      access_token: item.accessToken,
      webhook_code: 'DEFAULT_UPDATE',
    });
    return { ok: result.webhook_fired };
  });

  // Trigger a pet reaction without going through Plaid — needed for TestFlight
  // demos where there's no linked bank. Records to history, fans out an APNs
  // push, and returns the reaction so the iOS app can render it locally.
  app.post('/api/debug/react', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ReactQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const preset = DEBUG_PRESETS[parsed.data.animation];
    const reaction: Reaction = { ...preset, reason: `(debug) ${parsed.data.animation}` };

    await recordReaction(req.user!.id, 'debug', reaction);
    // 'debug' has its own contract row (push allowed): this endpoint exists to
    // exercise the full APNs path and only registers when PLAID_ENV=sandbox.
    dispatchReaction(req.user!.id, reaction, 'debug');
    return { ok: true, reaction };
  });

  // Lists the 50 most recent ingested transactions with the category the
  // adapter resolved and which rule (if any) would fire now given current goals.
  app.get('/api/debug/transactions', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db()
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(50);

    const [goals, weeklySpend] = await Promise.all([getGoals(userId), getWeeklySpendByCategory(userId)]);

    return {
      transactions: rows.map((row) => {
        // merchant_name is encrypted at rest (0048); the rule engine and the
        // response need the plaintext. Tolerant of pre-0048 plaintext rows.
        const merchantName = decryptNullable(row.merchantName);
        const fakeTx: Transaction = {
          id: row.transactionId,
          account_id: row.accountId,
          amount: row.amount,
          date: row.date,
          description: merchantName ?? '',
          status: 'posted',
          type: 'card_payment',
          running_balance: null,
          details: {
            category: row.category,
            ...(merchantName ? { counterparty: { name: merchantName, type: 'organization' as const } } : {}),
          },
        };
        // Collect-all (R-7.25): every matching rule, plus which one the
        // contract's precedence would actually perform.
        const matches = orderCandidates(evaluateAll(fakeTx, goals, { weeklySpendByCategory: weeklySpend }));
        return {
          id: row.transactionId,
          date: row.date,
          merchant: merchantName,
          amount: row.amount,
          category: row.category,
          rule_matched: matches[0]?.name ?? null,
          rules_matched: matches.map((m) => m.name),
        };
      }),
    };
  });

  // Resets Plaid cursors to null and clears processedEvents for this user's
  // transactions so the next fire-transaction re-evaluates all ingested txs
  // through the rule engine from scratch.
  app.post('/api/debug/reset-cursor', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const items = await getItemsByUser(userId);

    await Promise.all(items.map((item) => resetCursor(item.itemId)));
    const cleared = await clearUserEvents(userId);

    return { ok: true, items_reset: items.length, events_cleared: cleared };
  });
}

// Unauthenticated — creates a real session for a fixed simulator test user.
// Only registered when PLAID_ENV=sandbox. Never callable in production.
export function registerDebugSessionApi(app: FastifyInstance): void {
  app.post('/api/debug/session', async (_req: FastifyRequest, _reply: FastifyReply) => {
    const userId = await findOrCreateUser({ appleSub: 'debug-simulator-user' });
    const { rawToken } = await createSession(userId);
    return { token: rawToken };
  });
}
