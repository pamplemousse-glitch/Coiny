import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { itemPublicTokenExchange, linkTokenCreate } from '../plaid/client.js';
import { upsertItem } from '../store/items.js';

// Phase 1 single-user — hardcoded until T2.2 introduces real user identity.
const PHASE_1_USER_ID = 'user_1';

const ExchangeBodySchema = z.object({
  public_token: z.string().min(1),
});

export function registerPlaidLinkApi(app: FastifyInstance): void {
  app.post('/api/plaid/link-token', async () => {
    const res = await linkTokenCreate({ client_user_id: PHASE_1_USER_ID });
    return { link_token: res.link_token, expiration: res.expiration };
  });

  app.post('/api/plaid/exchange-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ExchangeBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { access_token, item_id } = await itemPublicTokenExchange(parsed.data.public_token);
    await upsertItem({ itemId: item_id, accessToken: access_token });

    req.log.info({ item_id }, 'plaid item linked');
    return { ok: true, item_id };
  });
}
