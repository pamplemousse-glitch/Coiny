import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { itemRemove } from '../plaid/client.js';
import { revokeUpstreamGrants } from '../revoke/upstream.js';
import { getItemsByUser } from '../store/items.js';
import { deleteUser, updateDisplayName } from '../store/users.js';

const PatchAccountSchema = z.object({
  display_name: z.string().min(1).max(100),
});

export function registerAccountApi(app: FastifyInstance): void {
  app.patch('/api/account', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PatchAccountSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await updateDisplayName(req.user!.id, parsed.data.display_name);
    return reply.status(200).send({ ok: true });
  });

  // GLBA/CCPA right-to-delete. Revokes every upstream authorization we can
  // revoke, then deletes the user row. All child tables cascade via FK
  // constraints.
  //
  // Revocation runs BEFORE the delete because the tokens live in the rows the
  // cascade is about to destroy. Every revocation is best-effort and logged:
  // the deletion right does not depend on a third party being reachable, so a
  // provider outage must never block it.
  app.delete('/api/account', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const items = await getItemsByUser(userId);

    for (const item of items) {
      try {
        await itemRemove(item.accessToken);
      } catch (err) {
        // Right-to-delete must not be blocked by Plaid availability or by an
        // item that's already been removed upstream. Log and continue.
        req.log.warn({ err, item_id: item.itemId }, 'plaid item_remove failed during account deletion');
      }
    }

    // Non-Plaid grants: TrueLayer is revocable, YNAB and Discogs are not.
    // See revoke/upstream.ts for which providers offer an endpoint and which
    // leave the user to revoke from their own settings.
    const revocations = await revokeUpstreamGrants(userId, req.log);

    await deleteUser(userId);
    req.log.info({ userId, removedItems: items.length, revocations }, 'account deleted');
    return reply.status(204).send();
  });
}
