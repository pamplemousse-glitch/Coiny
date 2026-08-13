import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  itemGet,
  itemPublicTokenExchange,
  itemRemove,
  liabilitiesGet,
  linkTokenCreate,
  linkTokenCreateUpdateMode,
  recurringTransactionsGet,
} from '../plaid/client.js';
import { PlaidApiError } from '../plaid/types.js';
import { trackServerEvent } from '../store/analytics.js';
import { canAddConnection } from '../store/entitlements.js';
import {
  disableItem,
  getItemForUser,
  getItemsByUser,
  markItemRepaired,
  type PlaidItemRow,
  setItemInstitution,
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
    // So the repair prompt can say "Chase needs you to sign in again" instead
    // of "Your bank" (S-17). Null for items linked without an institution
    // connection; the client falls back to the generic string.
    institution_name: item.institutionName,
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
  app.post('/api/plaid/link-token', async (req: FastifyRequest, reply: FastifyReply) => {
    // The connection gate (R-25.6, server-enforced so every client inherits
    // it). Checked before the Link flow starts so the user is never walked
    // through bank auth only to be refused; the 'connection_limit' code is the
    // client's cue to show the paywall (R-25.3).
    const gate = await canAddConnection(req.user!.id);
    if (!gate.ok) {
      return reply.status(403).send({ error: 'connection_limit', tier: gate.tier, limit: gate.limit });
    }
    const res = await linkTokenCreate({ client_user_id: req.user!.id });
    return { link_token: res.link_token, expiration: res.expiration };
  });

  app.post('/api/plaid/exchange-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ExchangeBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    // Backstop for the same gate: a link token minted before the limit was
    // reached must not become an over-limit connection.
    const gate = await canAddConnection(req.user!.id);
    if (!gate.ok) {
      return reply.status(403).send({ error: 'connection_limit', tier: gate.tier, limit: gate.limit });
    }

    const { access_token, item_id } = await itemPublicTokenExchange(parsed.data.public_token);
    const linkUserId = req.user!.id;

    // Capture the institution at link time (S-17): /item/get is free and the
    // institution never changes for an item, so this is fetched once, not on
    // every read. Best-effort: a failed lookup must not fail the link, and the
    // GET /api/plaid/items lazy backfill retries it later.
    let institution: { institutionId?: string | null; institutionName?: string | null } = {};
    try {
      const res = await itemGet(access_token);
      institution = { institutionId: res.item.institution_id, institutionName: res.item.institution_name };
    } catch {
      // Institution name is a garnish on the link; never log it or fail on it.
    }

    await upsertItem({ itemId: item_id, accessToken: access_token, userId: linkUserId, ...institution });

    req.log.info({ item_id }, 'plaid item linked');

    // Funnel instrumentation (prd.md R-24.2): the successful exchange is the
    // server's view of a new connection. asset_class is unknown until the
    // first data fetch, so it is omitted rather than guessed.
    const nthConnection = (await getItemsByUser(linkUserId)).length;
    await trackServerEvent(linkUserId, 'account_connected', { provider: 'plaid', nth_connection: nthConnection });

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

    // Lazy backfill for items linked before the institution columns existed:
    // fetch once from the free /item/get and persist, so subsequent reads are
    // pure DB. Best-effort per item; a Plaid failure leaves the name null and
    // the client falls back to "Your bank". Items whose institution is
    // genuinely null (micro-deposit links) re-attempt here, which is accepted:
    // the call is free and a user holds at most a dozen items.
    await Promise.all(
      items
        .filter((item) => item.institutionName === null && !item.disabled)
        .map(async (item) => {
          try {
            const res = await itemGet(item.accessToken);
            if (res.item.institution_name === null) return;
            await setItemInstitution(item.itemId, {
              institutionId: res.item.institution_id,
              institutionName: res.item.institution_name,
            });
            item.institutionName = res.item.institution_name;
            item.institutionId = res.item.institution_id;
          } catch {
            // Backfill is a garnish on the health read; never fail or log it.
          }
        }),
    );

    return { items: items.map(itemHealthView) };
  });

  // Link UPDATE MODE (docs/prd.md R-8.6): re-authenticate an existing Item
  // without creating a new one. The client opens Link with this token, the
  // user fixes their credentials, the existing access token keeps working,
  // and no history is lost. On Link success the client calls
  // POST /api/plaid/item-repaired; no public-token exchange happens.
  //
  // Deliberately NOT behind canAddConnection, unlike link-token and
  // exchange-token. Repair does not add a connection, it restores one the user
  // already has. Gating it would mean a free user at the connection limit whose
  // bank breaks can never fix it, which turns a paywall into a data-loss bug
  // and hands them the churn reason this whole flow exists to remove.
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
      // Repair completion is a server-observed fact: this endpoint IS the
      // completion signal, so the client never reports it via telemetry
      // (a device-reported copy would be redundant and forgeable).
      await trackServerEvent(req.user!.id, 'item_state_changed', { state: 'repaired' });
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
