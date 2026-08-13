import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  itemPublicTokenExchange,
  itemRemove,
  liabilitiesGet,
  linkTokenCreate,
  linkTokenCreateUpdateMode,
  recurringTransactionsGet,
} from '../plaid/client.js';
import { PlaidApiError } from '../plaid/types.js';
import {
  disableItem,
  getItemForUser,
  getItemsByUser,
  markItemRepaired,
  type PlaidItemRow,
  setItemStatus,
  upsertItem,
} from '../store/items.js';
import { cacheLiabilities } from '../store/plaid-liabilities.js';
import { upsertRecurringStreams } from '../store/plaid-recurring.js';

const ExchangeBodySchema = z.object({
  public_token: z.string().min(1),
});

const ItemIdBodySchema = z.object({
  item_id: z.string().min(1),
});

// Client-facing item health shape (docs/prd.md R-8.5). Additive: new endpoint,
// no existing response changed, so shipped iOS/Android builds are unaffected.
function itemHealthView(item: PlaidItemRow): Record<string, unknown> {
  return {
    item_id: item.itemId,
    status: item.status,
    status_changed_at: item.statusChangedAt?.toISOString() ?? null,
    last_error_code: item.lastErrorCode,
    new_accounts_available: item.newAccountsAvailable,
    disabled: item.disabled,
    // Convenience for the UI: anything not healthy is offered repair.
    repairable: !item.disabled && item.status !== 'healthy',
    created_at: item.createdAt.toISOString(),
  };
}

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

  // Item connection health, so the client can say which bank connection is
  // broken and offer repair instead of a stale number (docs/prd.md R-8.5).
  app.get('/api/plaid/items', async (req: FastifyRequest) => {
    const items = await getItemsByUser(req.user!.id);
    return { items: items.map(itemHealthView) };
  });

  // Link UPDATE MODE (docs/prd.md R-8.6): re-authenticate an existing Item
  // without creating a new one. The client opens Link with this token, the
  // user fixes their credentials, the existing access token keeps working,
  // and no history is lost. On Link success the client calls
  // POST /api/plaid/item-repaired; no public-token exchange happens.
  app.post('/api/plaid/update-link-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ItemIdBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const item = await getItemForUser(req.user!.id, parsed.data.item_id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });

    try {
      const res = await linkTokenCreateUpdateMode({
        client_user_id: req.user!.id,
        access_token: item.accessToken,
        // When Plaid has flagged new accounts, let the user share them in the
        // same update-mode session.
        account_selection_enabled: item.newAccountsAvailable,
      });
      req.log.info({ item_id: item.itemId }, 'plaid update-mode link token minted');
      return { link_token: res.link_token, expiration: res.expiration, item_id: item.itemId };
    } catch (err) {
      if (err instanceof PlaidApiError) {
        // Revoked items can reject update mode; the client should fall back
        // to a fresh link. Only the programmatic code is surfaced or logged.
        req.log.warn(
          { item_id: item.itemId, plaid_error_code: err.body.error_code },
          'plaid update-mode link token creation failed',
        );
        return reply
          .status(502)
          .send({ error: 'Plaid rejected update-mode link token', plaid_error_code: err.body.error_code });
      }
      throw err;
    }
  });

  // Completion callback for update mode. Plaid fires LOGIN_REPAIRED only when
  // an item heals outside our app, so the client reports its own successful
  // update-mode session here to flip the item back to healthy immediately.
  app.post('/api/plaid/item-repaired', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ItemIdBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const result = await markItemRepaired(req.user!.id, parsed.data.item_id);
    if (!result) return reply.status(404).send({ error: 'Item not found' });

    if (result.previous !== 'healthy') {
      // Same seam as webhook/plaid.ts transitionItemStatus: instrumentation
      // (docs/prd.md section 24) attaches to this event. No push from here.
      req.log.info(
        { event: 'item_state_changed', item_id: parsed.data.item_id, from: result.previous, to: 'healthy' },
        'plaid item repaired via update mode',
      );
    }
    return { ok: true, item_id: parsed.data.item_id, status: 'healthy' };
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
        await setItemStatus(item.itemId, 'revoked', { errorCode: null });
        await disableItem(item.itemId);
      }),
    );

    req.log.info({ count: items.length }, 'plaid items unlinked');
    return reply.status(204).send();
  });
}
