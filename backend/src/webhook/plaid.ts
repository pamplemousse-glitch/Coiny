import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { deltaForEvent } from '../health/score.js';
import { plaidTxToInternal } from '../plaid/adapter.js';
import { liabilitiesGet, recurringTransactionsGet, transactionsSync } from '../plaid/client.js';
import { verifyPlaidSignature } from '../plaid/signature.js';
import { type PlaidAccount, PlaidApiError, type PlaidWebhookEnvelope } from '../plaid/types.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import type { RuleContext } from '../rules/engine.js';
import { evaluate } from '../rules/engine.js';
import { trackServerEvent } from '../store/analytics.js';
import { claimEvent } from '../store/events.js';
import {
  disableItem,
  getItem,
  markInitialSyncComplete,
  type PlaidItemStatus,
  setCursor,
  setItemStatus,
  setNewAccountsAvailable,
} from '../store/items.js';
import { applyHealthDelta, getGoals, recordReaction } from '../store/pet.js';
import { cacheLiabilities } from '../store/plaid-liabilities.js';
import { upsertRecurringStreams } from '../store/plaid-recurring.js';
import { getWeeklySpendByCategory, persistTransactions, upsertModifiedTransactions } from '../store/transactions.js';

const SYNC_TRIGGERS = new Set(['SYNC_UPDATES_AVAILABLE', 'DEFAULT_UPDATE']);

// ITEM webhook fields we act on (docs/context/plaid.md, Items > Webhooks).
// The error object rides on ITEM/ERROR; only the programmatic code is read.
const ItemWebhookSchema = z.object({
  webhook_code: z.string(),
  item_id: z.string().min(1),
  error: z.object({ error_code: z.string() }).nullable().optional(),
});

/**
 * Persist a lifecycle transition and, when the state actually changed, emit
 * `item_state_changed` (docs/prd.md R-8.5, section 24).
 *
 * SEAM: this log line is the single place instrumentation hooks into item
 * lifecycle events, and where a future "should we prompt the user?" decision
 * would attach. Deliberately no push from here: the notification budget
 * (2 per rolling 7 days, allowlisted animations) is owned by
 * reactions/dispatch.ts, and recording state must never spend it.
 */
async function transitionItemStatus(
  app: FastifyInstance,
  itemId: string,
  to: PlaidItemStatus,
  opts?: { errorCode?: string | null; onlyIfCurrent?: readonly PlaidItemStatus[] },
): Promise<void> {
  const result = await setItemStatus(itemId, to, opts ?? {});
  if (!result) {
    app.log.warn({ item_id: itemId }, 'plaid item webhook for unknown item');
    return;
  }
  if (!result.changed) {
    app.log.info({ item_id: itemId, status: result.previous }, 'plaid item status unchanged');
    return;
  }
  app.log.info(
    {
      event: 'item_state_changed',
      item_id: itemId,
      from: result.previous,
      to,
      error_code: opts?.errorCode ?? null,
    },
    'plaid item state changed',
  );

  // Connection breakage is the documented number one churn cause in this
  // category, so every lifecycle transition is a measurable server-observed
  // fact (R-24.2), not just the revoked edge that disableItem already emits.
  // The Plaid error code is a closed vocabulary from Plaid, never message text.
  if (result.userId) {
    await trackServerEvent(result.userId, 'item_state_changed', {
      state: to,
      ...(opts?.errorCode ? { error_code: opts.errorCode.toLowerCase() } : {}),
    });
  }
}

export function registerPlaidWebhook(app: FastifyInstance): void {
  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });

    scope.post('/webhooks/plaid', async (req: FastifyRequest, reply: FastifyReply) => {
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

      req.log.info(
        {
          webhook_type: envelope.webhook_type,
          webhook_code: envelope.webhook_code,
          item_id: envelope.item_id,
        },
        'plaid webhook verified',
      );

      reply.status(200).send({ ok: true });

      setImmediate(async () => {
        try {
          await dispatch(app, envelope);
        } catch (err) {
          // A data call (sync, liabilities, recurring) failing with
          // ITEM_LOGIN_REQUIRED is detection in its own right: the item is
          // broken even if the ITEM/ERROR webhook was missed or is delayed.
          if (err instanceof PlaidApiError && err.body.error_code === 'ITEM_LOGIN_REQUIRED' && envelope.item_id) {
            try {
              await transitionItemStatus(app, envelope.item_id, 'reauth_required', {
                errorCode: 'ITEM_LOGIN_REQUIRED',
              });
            } catch (transitionErr) {
              app.log.error({ err: transitionErr }, 'failed to record item re-auth state');
            }
          }
          app.log.error({ err }, 'unhandled error processing plaid webhook');
        }
      });
    });
  });
}

/**
 * ITEM lifecycle webhooks (docs/prd.md R-8.5). Codes verified against
 * docs/context/plaid.md, Items > Webhooks:
 * - ERROR: item hit an error resolvable via Link update mode. The one that
 *   matters most is error_code ITEM_LOGIN_REQUIRED (credentials changed).
 * - PENDING_DISCONNECT (US/CA) and PENDING_EXPIRATION (UK/EU): access ends in
 *   7 days; resolvable via update mode ahead of the break.
 * - LOGIN_REPAIRED: the item healed without our update-mode flow (e.g. fixed
 *   through another app). Stop reporting it broken.
 * - NEW_ACCOUNTS_AVAILABLE: new account detected; flag it so the client can
 *   offer update mode with account selection. Not a health problem.
 * - USER_PERMISSION_REVOKED: user revoked access; item disabled and marked
 *   revoked. Update mode MAY restore it, so the row is kept.
 */
async function handleItemWebhook(app: FastifyInstance, webhook: z.infer<typeof ItemWebhookSchema>): Promise<void> {
  const { webhook_code, item_id } = webhook;

  switch (webhook_code) {
    case 'ERROR': {
      const errorCode = webhook.error?.error_code ?? 'UNKNOWN';
      app.log.warn({ item_id, error_code: errorCode }, 'plaid item error, re-auth required');
      await transitionItemStatus(app, item_id, 'reauth_required', { errorCode });
      return;
    }
    case 'PENDING_DISCONNECT':
    case 'PENDING_EXPIRATION':
      app.log.warn({ item_id, webhook_code }, 'plaid item consent expiring');
      // Only a healthy item moves to expiring: an item already needing
      // re-auth (or revoked) must not be downgraded to a softer state.
      await transitionItemStatus(app, item_id, 'expiring', {
        errorCode: webhook_code,
        onlyIfCurrent: ['healthy'],
      });
      return;
    case 'LOGIN_REPAIRED':
      app.log.info({ item_id }, 'plaid item healed outside our update-mode flow');
      // A revoked item stays revoked: LOGIN_REPAIRED covers recovery from
      // ITEM_LOGIN_REQUIRED, not from revocation.
      await transitionItemStatus(app, item_id, 'healthy', {
        onlyIfCurrent: ['reauth_required', 'expiring'],
      });
      return;
    case 'NEW_ACCOUNTS_AVAILABLE':
      app.log.info({ item_id }, 'plaid new accounts available');
      await setNewAccountsAvailable(item_id, true);
      return;
    case 'USER_PERMISSION_REVOKED':
      app.log.warn({ item_id }, 'plaid item permission revoked, disabling');
      await transitionItemStatus(app, item_id, 'revoked', { errorCode: 'USER_PERMISSION_REVOKED' });
      await disableItem(item_id);
      return;
    default:
      app.log.info({ webhook_code, item_id }, 'plaid item webhook, no-op');
      return;
  }
}

async function dispatch(app: FastifyInstance, envelope: PlaidWebhookEnvelope): Promise<void> {
  const { webhook_type, webhook_code, item_id } = envelope;

  if (webhook_type === 'ITEM') {
    const parsed = ItemWebhookSchema.safeParse(envelope);
    if (!parsed.success) {
      app.log.warn({ webhook_code, item_id }, 'plaid ITEM webhook failed validation, ignoring');
      return;
    }
    await handleItemWebhook(app, parsed.data);
    return;
  }

  if (webhook_type === 'LIABILITIES' && webhook_code === 'DEFAULT_UPDATE') {
    const item = await getItem(item_id);
    if (!item?.userId || item.disabled) {
      app.log.info({ item_id }, 'plaid liabilities webhook — item not found or disabled');
      return;
    }
    const liabilities = await liabilitiesGet(item.accessToken);
    await cacheLiabilities(item.userId, liabilities);
    app.log.info(
      {
        item_id,
        credit_count: liabilities.liabilities.credit?.length ?? 0,
        student_count: liabilities.liabilities.student?.length ?? 0,
      },
      'plaid liabilities cached',
    );
    // Fire overdue reaction if any credit account is past-due.
    const overdueAccounts = liabilities.liabilities.credit?.filter((c) => c.is_overdue === true) ?? [];
    if (overdueAccounts.length > 0) {
      const overdueReaction = {
        animation: 'concerned' as const,
        sound: 'warning' as const,
        led: 'red' as const,
        duration: 2000,
        reason: 'overdue_payment',
      };
      await applyHealthDelta(item.userId, -5);
      await recordReaction(item.userId, 'overdue_payment', overdueReaction);
      dispatchReaction(item.userId, overdueReaction);
    }
    return;
  }

  if (webhook_type !== 'TRANSACTIONS') {
    app.log.info({ webhook_type, webhook_code }, 'plaid webhook unhandled type — no-op');
    return;
  }

  if (webhook_code === 'RECURRING_TRANSACTIONS_UPDATE') {
    const item = await getItem(item_id);
    if (!item?.userId || item.disabled) {
      app.log.info({ item_id }, 'plaid recurring webhook — item not found or disabled');
      return;
    }
    const recurring = await recurringTransactionsGet(item.accessToken);
    await upsertRecurringStreams(item.userId, recurring.inflow_streams, recurring.outflow_streams);
    app.log.info(
      { item_id, inflow: recurring.inflow_streams.length, outflow: recurring.outflow_streams.length },
      'plaid recurring transactions stored',
    );
    return;
  }

  if (!SYNC_TRIGGERS.has(webhook_code)) {
    app.log.info({ webhook_code }, 'plaid transactions webhook — no-op');
    return;
  }

  const item = await getItem(item_id);
  if (!item) {
    app.log.warn({ item_id }, 'plaid webhook for unknown item — likely link-flow race');
    return;
  }

  if (!item.userId) {
    app.log.error({ item_id }, 'plaid item has no user_id — skipping');
    return;
  }

  if (item.disabled) {
    app.log.info({ item_id }, 'plaid item disabled — skipping sync');
    return;
  }

  await syncItem(app, item as typeof item & { userId: string });
}

async function syncItem(
  app: FastifyInstance,
  item: { itemId: string; accessToken: string; cursor: string | null; initialSyncComplete: boolean; userId: string },
): Promise<void> {
  const { userId } = item;
  const originalCursor = item.cursor ?? undefined;
  let cursor = originalCursor;
  let accountBalances = new Map<string, number | null>();
  const allAdded: import('../plaid/types.js').PlaidTransaction[] = [];

  for (;;) {
    let res: Awaited<ReturnType<typeof transactionsSync>>;
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

    if (res.modified.length > 0) {
      const adaptedModified = await Promise.all(
        res.modified.map((plaidTx) =>
          plaidTxToInternal(plaidTx, accountBalances.get(plaidTx.account_id) ?? null, userId),
        ),
      );
      await upsertModifiedTransactions(userId, adaptedModified);
      app.log.info({ item_id: item.itemId, modified: res.modified.length }, 'plaid modified transactions updated');
    }

    if (res.removed.length > 0) {
      app.log.info({ item_id: item.itemId, removed: res.removed.length }, 'plaid removed transactions — no-op phase 1');
    }

    if (!res.has_more) break;
  }

  const adapted = await Promise.all(
    allAdded.map((plaidTx) => plaidTxToInternal(plaidTx, accountBalances.get(plaidTx.account_id) ?? null, userId)),
  );

  // Snapshot weekly spend BEFORE persisting this batch so the running total
  // in the evaluation loop starts from the pre-batch state.
  const weeklySpendSnapshot = await getWeeklySpendByCategory(userId);

  await persistTransactions(userId, adapted);
  // Cursor advances only after transactions are safely persisted. Reversing this
  // order would cause permanent data loss if the process crashed between the two calls.
  if (cursor) await setCursor(item.itemId, cursor);

  if (!item.initialSyncComplete) {
    app.log.info(
      { item_id: item.itemId, transactions: allAdded.length },
      'plaid initial sync — ingesting without rule evaluation',
    );
    await markInitialSyncComplete(item.itemId);
    return;
  }

  if (adapted.length === 0) return;

  const goals = await getGoals(userId);
  // runningSpend grows as we claim each new transaction, giving overspent_in_category
  // an accurate cumulative total and allowing it to fire exactly once per threshold crossing.
  const runningSpend = { ...weeklySpendSnapshot };

  for (const tx of adapted) {
    if (!(await claimEvent(tx.id))) {
      app.log.debug({ transaction_id: tx.id }, 'plaid tx already processed');
      continue;
    }

    // Add this transaction to the running total before evaluating so the rule
    // sees the post-transaction weekly spend (including this tx).
    const cat = tx.details?.category;
    if (cat && parseFloat(tx.amount) < 0) {
      runningSpend[cat] = (runningSpend[cat] ?? 0) + Math.abs(parseFloat(tx.amount));
    }

    const context: RuleContext = { weeklySpendByCategory: runningSpend };
    const match = evaluate(tx, goals, context);
    // No `amount`: logging it puts financial detail in every log sink, which
    // .claude/rules/security.md #2 forbids. transaction_id is pseudonymous and
    // is enough to correlate; the amount can be read from the DB when debugging.
    app.log.info(
      {
        transaction_id: tx.id,
        category: tx.details?.category ?? null,
        rule_matched: match?.name ?? null,
      },
      'rule evaluation',
    );
    if (match) {
      await applyHealthDelta(userId, deltaForEvent(match.name));
      await recordReaction(userId, match.name, match.reaction);
      dispatchReaction(userId, match.reaction);
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
