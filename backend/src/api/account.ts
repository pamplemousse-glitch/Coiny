import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { itemRemove } from '../plaid/client.js';
import { PlaidApiError } from '../plaid/types.js';
import { revokeUpstreamGrants } from '../revoke/upstream.js';
import { getItemsByUser } from '../store/items.js';
import { enqueueItemRemoval } from '../store/plaid-removal-queue.js';
import { deleteOtherSessions } from '../store/sessions.js';
import { deleteUser, updateDisplayName } from '../store/users.js';

const PatchAccountSchema = z.object({
  display_name: z.string().min(1).max(100),
});

// DELETE carries an optional body. Fastify gives `undefined` when the client
// sends none, which is the shipped iOS build's behaviour, so every field is
// optional and an absent body parses clean.
const DeleteAccountSchema = z.object({
  // A fresh Sign in with Apple authorization code, for the TN3194 case where
  // no usable refresh token is held (a user who signed in before the code was
  // collected). Never required: deletion must not depend on the client being
  // able to produce one.
  apple_authorization_code: z.string().min(1).max(2048).nullish(),
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

    // A malformed body is not a reason to refuse a deletion. The only thing in
    // it is an optimisation for the Apple revoke call, so a body we cannot read
    // means we proceed without it rather than 400 a right-to-delete request.
    const parsed = DeleteAccountSchema.safeParse(req.body ?? {});
    const appleAuthorizationCode = parsed.success ? (parsed.data.apple_authorization_code ?? null) : null;

    const items = await getItemsByUser(userId);

    for (const item of items) {
      try {
        await itemRemove(item.accessToken);
      } catch (err) {
        // Right-to-delete must not be blocked by Plaid availability or by an
        // item that's already been removed upstream. Log and continue.
        //
        // But do not let the token go with it. deleteUser below cascades
        // plaid_items away via the user foreign key, so before this queue
        // existed a Plaid outage during an account deletion left an Item
        // billed monthly that we had no credential left to cancel. The queue
        // row carries no user_id and no foreign key, so it survives the
        // cascade, and it is deleted the moment the removal succeeds.
        req.log.warn(
          { err, item_id: item.itemId },
          'plaid item_remove failed during account deletion; queued for retry',
        );
        // Wrapped, and the wrapping is the point. A throw from the queue write
        // would escape this catch, abandon the loop and abort the deletion,
        // which turns a billing safeguard into something that can block a
        // statutory right-to-delete. The deletion outranks the queue: if the
        // queue write fails we are back to the old behaviour, a billed Item we
        // cannot cancel, which is money rather than a legal obligation.
        // Logged at error because nothing else will ever mention this Item
        // again.
        try {
          await enqueueItemRemoval({
            itemId: item.itemId,
            accessToken: item.accessToken,
            errorCode: err instanceof PlaidApiError ? err.body.error_code : null,
          });
        } catch (queueErr) {
          req.log.error(
            { err: queueErr, item_id: item.itemId },
            'could not queue plaid item for removal; this Item will keep billing and cannot be cancelled',
          );
        }
      }
    }

    // Non-Plaid grants: Apple, TrueLayer and Spinwheel are revocable, the rest
    // are not. See revoke/upstream.ts for which providers offer an endpoint and
    // which leave the user to revoke from their own settings. Deleting the
    // account must do at least as much upstream as disconnecting a single
    // connection would have.
    //
    // Apple is the one Apple itself requires (TN3194); it runs first inside
    // that call, while the user row it reads the refresh token from still
    // exists.
    const revocations = await revokeUpstreamGrants(userId, req.log, { appleAuthorizationCode });

    await deleteUser(userId);
    req.log.info({ userId, removedItems: items.length, revocations }, 'account deleted');
    return reply.status(204).send();
  });

  // Ends every session except the caller's own (Part 1 row 1.4.5).
  //
  // The story this exists for: a phone is taken while unlocked. Changing the
  // Apple ID password does not touch a Coiny session, and until now the only
  // session a person could end was the one on the device they no longer had.
  // With this, they sign in on a replacement device and end everything else.
  //
  // It lives on /api/account rather than /api/auth because it is the one
  // session route that has to know WHO is asking, and the auth routes are
  // registered in server.ts's public scope where `req.user` is never populated
  // (see the note on the logout route in api/auth.ts). Everything under
  // /api/account is inside the protected scope by construction.
  //
  // Rate-limited well below the global bucket: this is a deliberate,
  // once-in-a-crisis action, and a loop of it is a way to keep a legitimate
  // user's replacement device churning sessions.
  app.post(
    '/api/account/sessions/revoke-all',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = req.user!.id;
      // The plugin has already validated this token, so it is the caller's
      // live session and the one row that must survive.
      const currentToken = (req.headers.authorization ?? '').slice(7).trim();

      const revoked = await deleteOtherSessions(userId, currentToken);
      req.log.info({ userId, revoked }, 'other sessions revoked');
      return reply.status(200).send({ revoked });
    },
  );
}
