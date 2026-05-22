import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { itemRemove } from '../plaid/client.js';
import { getItemsByUser } from '../store/items.js';
import { deleteUser } from '../store/users.js';

export function registerAccountApi(app: FastifyInstance): void {
  // GLBA/CCPA right-to-delete. Removes all Plaid items (revokes Plaid's
  // access on their side) and deletes the user row. All child tables
  // cascade via FK constraints.
  app.delete('/api/account', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user.id;
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

    await deleteUser(userId);
    req.log.info({ userId, removedItems: items.length }, 'account deleted');
    return reply.status(204).send();
  });
}
