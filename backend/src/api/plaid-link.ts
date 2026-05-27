import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  itemPublicTokenExchange,
  itemRemove,
  liabilitiesGet,
  linkTokenCreate,
  recurringTransactionsGet,
} from '../plaid/client.js';
import { disableItem, getItemsByUser, upsertItem } from '../store/items.js';
import { cacheLiabilities } from '../store/plaid-liabilities.js';
import { upsertRecurringStreams } from '../store/plaid-recurring.js';

const ExchangeBodySchema = z.object({
  public_token: z.string().min(1),
});

export function registerPlaidLinkApi(app: FastifyInstance): void {
  app.post('/api/plaid/link-token', async (req: FastifyRequest) => {
    const res = await linkTokenCreate({ client_user_id: req.user!.id });
    return { link_token: res.link_token, expiration: res.expiration };
  });

  app.post('/api/plaid/exchange-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ExchangeBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { access_token, item_id } = await itemPublicTokenExchange(parsed.data.public_token);
    const linkUserId = req.user!.id;
    await upsertItem({ itemId: item_id, accessToken: access_token, userId: linkUserId });

    req.log.info({ item_id }, 'plaid item linked');

    // Seed recurring streams and liability cache in the background.
    // Non-fatal — will populate on the first webhook if this fails.
    setImmediate(() => {
      Promise.all([recurringTransactionsGet(access_token), liabilitiesGet(access_token)])
        .then(([recurring, liabilities]) =>
          Promise.all([
            upsertRecurringStreams(linkUserId, recurring.inflow_streams, recurring.outflow_streams),
            cacheLiabilities(linkUserId, liabilities),
          ]),
        )
        .catch(() => {
          // intentionally swallowed — background seed failure is non-fatal
        });
    });

    return { ok: true, item_id };
  });

  app.delete('/api/plaid/item', async (req: FastifyRequest, reply: FastifyReply) => {
    const items = await getItemsByUser(req.user!.id);
    if (!items.length) return reply.status(204).send();

    await Promise.allSettled(
      items.map(async (item) => {
        try {
          await itemRemove(item.accessToken);
        } catch (err) {
          req.log.warn({ err, item_id: item.itemId }, 'plaid item_remove failed during unlink');
        }
        await disableItem(item.itemId);
      }),
    );

    req.log.info({ count: items.length }, 'plaid items unlinked');
    return reply.status(204).send();
  });
}
