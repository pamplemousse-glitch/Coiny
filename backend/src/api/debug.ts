import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { plaidItems } from '../db/schema.js';
import { itemWebhookUpdate, sandboxItemFireWebhook } from '../plaid/client.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import type { Animation, Reaction } from '../reactions/types.js';
import { recordReaction } from '../store/pet.js';
import { createSession } from '../store/sessions.js';
import { findOrCreateUser } from '../store/users.js';

const DEBUG_PRESETS: Record<Animation, Omit<Reaction, 'reason'>> = {
  celebrate: { animation: 'celebrate', sound: 'fanfare', led: 'rainbow', duration: 3000 },
  happy: { animation: 'happy', sound: 'chime', led: 'green', duration: 2000 },
  sad: { animation: 'sad', sound: 'warning', led: 'red', duration: 2000 },
  concerned: { animation: 'concerned', sound: 'warning', led: 'amber', duration: 2000 },
  neutral: { animation: 'neutral', sound: 'off', led: 'off', duration: 1000 },
  sleeping: { animation: 'sleeping', sound: 'off', led: 'off', duration: 0 },
};

const ReactQuerySchema = z.object({
  animation: z.enum(Object.keys(DEBUG_PRESETS) as [Animation, ...Animation[]]),
});

// Only registered when PLAID_ENV=sandbox — not callable in production.
export function registerDebugApi(app: FastifyInstance): void {
  app.post('/api/debug/fire-transaction', async (req: FastifyRequest, reply: FastifyReply) => {
    const [item] = await db().select().from(plaidItems).where(eq(plaidItems.userId, req.user!.id)).limit(1);
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
    dispatchReaction(req.user!.id, reaction);
    return { ok: true, reaction };
  });
}

// Unauthenticated — creates a real session for a fixed simulator test user.
// Only registered when PLAID_ENV=sandbox. Never callable in production.
export function registerDebugSessionApi(app: FastifyInstance): void {
  app.post('/api/debug/session', async (_req: FastifyRequest, _reply: FastifyReply) => {
    const userId = await findOrCreateUser({ appleSub: 'debug-simulator-user', email: 'simulator@coiny.dev' });
    const { rawToken } = await createSession(userId);
    return { token: rawToken };
  });
}
