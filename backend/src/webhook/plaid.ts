import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { deltaForEvent } from '../health/score.js';
import { plaidTxToInternal } from '../plaid/adapter.js';
import { liabilitiesGet, recurringTransactionsGet, transactionsSync } from '../plaid/client.js';
import { verifyPlaidSignature } from '../plaid/signature.js';
import { type PlaidAccount, PlaidApiError, type PlaidWebhookEnvelope } from '../plaid/types.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import type { RuleContext } from '../rules/engine.js';
import { evaluate } from '../rules/engine.js';
import { claimEvent } from '../store/events.js';
import { disableItem, getItem, markInitialSyncComplete, setCursor } from '../store/items.js';
import { applyHealthDelta, getGoals, recordReaction } from '../store/pet.js';
import { getWeeklySpendByCategory, persistTransactions } from '../store/transactions.js';

const SYNC_TRIGGERS = new Set(['SYNC_UPDATES_AVAILABLE', 'DEFAULT_UPDATE']);

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
          app.log.error({ err }, 'unhandled error processing plaid webhook');
        }
      });
    });
  });
}

async function dispatch(app: FastifyInstance, envelope: PlaidWebhookEnvelope): Promise<void> {
  const { webhook_type, webhook_code, item_id } = envelope;

  if (webhook_type === 'ITEM') {
    if (webhook_code === 'USER_PERMISSION_REVOKED' && item_id) {
      app.log.warn({ item_id }, 'plaid item permission revoked — disabling');
      await disableItem(item_id);
      return;
    }
    if (webhook_code === 'PENDING_EXPIRATION' && item_id) {
      app.log.warn({ item_id }, 'plaid item pending expiration — re-auth required');
      return;
    }
    if (webhook_code === 'NEW_ACCOUNTS_AVAILABLE' && item_id) {
      app.log.info({ item_id }, 'plaid new accounts available');
      return;
    }
    app.log.info({ webhook_type, webhook_code, item_id }, 'plaid item webhook — no-op');
    return;
  }

  if (webhook_type === 'LIABILITIES' && webhook_code === 'DEFAULT_UPDATE') {
    const item = await getItem(item_id);
    if (!item?.userId || item.disabled) {
      app.log.info({ item_id }, 'plaid liabilities webhook — item not found or disabled');
      return;
    }
    const liabilities = await liabilitiesGet(item.accessToken);
    app.log.info(
      {
        item_id,
        credit_count: liabilities.liabilities.credit?.length ?? 0,
        student_count: liabilities.liabilities.student?.length ?? 0,
      },
      'plaid liabilities updated',
    );
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
    app.log.info(
      { item_id, inflow: recurring.inflow_streams.length, outflow: recurring.outflow_streams.length },
      'plaid recurring transactions updated',
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

    if (res.modified.length > 0 || res.removed.length > 0) {
      app.log.info(
        { item_id: item.itemId, modified: res.modified.length, removed: res.removed.length },
        'plaid sync delta — ignoring modified/removed in phase 1',
      );
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
    app.log.info(
      {
        transaction_id: tx.id,
        category: tx.details?.category ?? null,
        amount: tx.amount,
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
