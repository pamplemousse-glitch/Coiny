import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyPlaidSignature } from '../plaid/signature.js';
import { transactionsSync } from '../plaid/client.js';
import { plaidTxToInternal } from '../plaid/adapter.js';
import { PlaidApiError, type PlaidAccount, type PlaidWebhookEnvelope } from '../plaid/types.js';
import { evaluate } from '../rules/engine.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { claimEvent } from '../store/events.js';
import { applyHealthDelta, getGoals, recordReaction } from '../store/pet.js';
import {
  disableItem,
  getItem,
  markInitialSyncComplete,
  setCursor,
} from '../store/items.js';
import { deltaForEvent } from '../health/score.js';

// Webhook code dispatch — see docs/plaid-integration.md §6.
const SYNC_TRIGGERS = new Set(['SYNC_UPDATES_AVAILABLE', 'DEFAULT_UPDATE']);

export function registerPlaidWebhook(app: FastifyInstance): void {
  app.register(async (scope) => {
    // We need the raw body bytes for the SHA-256 in the JWT payload.
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (_req, body, done) {
      done(null, body);
    });

    scope.post('/webhooks/plaid', async function (req: FastifyRequest, reply: FastifyReply) {
      const rawBody = req.body as Buffer;
      const signatureHeader = req.headers['plaid-verification'] as string | undefined;

      const verification = await verifyPlaidSignature(signatureHeader, rawBody);
      if (!verification.ok) {
        req.log.warn({ reason: verification.reason }, 'plaid webhook signature rejected');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      let envelope: PlaidWebhookEnvelope;
      try {
        envelope = JSON.parse(rawBody.toString('utf8')) as PlaidWebhookEnvelope;
      } catch (err) {
        req.log.warn({ err }, 'plaid webhook body parse failed');
        return reply.status(400).send({ error: 'Bad Request' });
      }

      req.log.info({
        webhook_type: envelope.webhook_type,
        webhook_code: envelope.webhook_code,
        item_id: envelope.item_id,
      }, 'plaid webhook verified');

      // Always ack fast; do the work async.
      reply.status(200).send({ ok: true });

      setImmediate(async () => {
        try {
          await dispatch(app, envelope);
        } catch (err) {
          app.log.error({ err }, 'unhandled error processing plaid webhook');
        }
      });
    });
  });
}

async function dispatch(app: FastifyInstance, envelope: PlaidWebhookEnvelope): Promise<void> {
  const { webhook_type, webhook_code, item_id } = envelope;

  // ITEM-scoped webhooks
  if (webhook_type === 'ITEM') {
    if (webhook_code === 'USER_PERMISSION_REVOKED' && item_id) {
      app.log.warn({ item_id }, 'plaid item permission revoked — disabling');
      await disableItem(item_id);
      return;
    }
    app.log.info({ webhook_type, webhook_code, item_id }, 'plaid item webhook — no-op');
    return;
  }

  if (webhook_type !== 'TRANSACTIONS') {
    app.log.info({ webhook_type, webhook_code }, 'plaid webhook unhandled type — no-op');
    return;
  }

  if (!SYNC_TRIGGERS.has(webhook_code)) {
    app.log.info({ webhook_code }, 'plaid transactions webhook — no-op');
    return;
  }

  const item = await getItem(item_id);
  if (!item) {
    // Race: webhook arrived before exchange-token persisted the item. Plaid
    // will redeliver after exchange completes (next SYNC_UPDATES_AVAILABLE).
    app.log.warn({ item_id }, 'plaid webhook for unknown item — likely link-flow race');
    return;
  }

  if (item.disabled) {
    app.log.info({ item_id }, 'plaid item disabled — skipping sync');
    return;
  }

  await syncItem(app, item);
}

async function syncItem(
  app: FastifyInstance,
  item: { itemId: string; accessToken: string; cursor: string | null; initialSyncComplete: boolean },
): Promise<void> {
  const originalCursor = item.cursor ?? undefined;
  let cursor = originalCursor;
  let accountBalances = new Map<string, number | null>();
  const allAdded: import('../plaid/types.js').PlaidTransaction[] = [];

  // Loop until has_more is false. On mutation-during-pagination error,
  // restart the entire loop from originalCursor.
  for (;;) {
    let res;
    try {
      res = await transactionsSync({
        access_token: item.accessToken,
        ...(cursor ? { cursor } : {}),
      });
    } catch (err) {
      if (err instanceof PlaidApiError && err.body.error_code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') {
        app.log.warn({ item_id: item.itemId }, 'plaid sync mutation during pagination — restarting');
        cursor = originalCursor;
        accountBalances = new Map();
        allAdded.length = 0;
        continue;
      }
      throw err;
    }

    accountBalances = balancesByAccount(res.accounts);
    allAdded.push(...res.added);
    cursor = res.next_cursor;

    if (res.modified.length > 0 || res.removed.length > 0) {
      app.log.info({
        item_id: item.itemId,
        modified: res.modified.length,
        removed: res.removed.length,
      }, 'plaid sync delta — ignoring modified/removed in phase 1');
    }

    if (!res.has_more) break;
  }

  // Persist the new cursor before any rule eval; if we crash here, redelivery
  // re-processes added transactions but transaction-level idempotency dedupes.
  if (cursor) await setCursor(item.itemId, cursor);

  if (!item.initialSyncComplete) {
    app.log.info({
      item_id: item.itemId,
      transactions: allAdded.length,
    }, 'plaid initial sync — ingesting without rule evaluation');
    await markInitialSyncComplete(item.itemId);
    return;
  }

  if (allAdded.length === 0) return;

  const goals = await getGoals();

  for (const plaidTx of allAdded) {
    const balance = accountBalances.get(plaidTx.account_id) ?? null;
    const tx = plaidTxToInternal(plaidTx, balance);

    // Transaction-level idempotency: skip if we've already processed this
    // transaction_id (e.g., from a redelivered webhook).
    if (!(await claimEvent(tx.id))) {
      app.log.debug({ transaction_id: tx.id }, 'plaid tx already processed');
      continue;
    }

    const match = evaluate(tx, goals);
    if (match) {
      await applyHealthDelta(deltaForEvent(match.name));
      await recordReaction(match.name, match.reaction);
      dispatchReaction(match.reaction);
    }
  }
}

function balancesByAccount(accounts: PlaidAccount[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const acc of accounts) {
    map.set(acc.account_id, acc.balances.current ?? acc.balances.available);
  }
  return map;
}
