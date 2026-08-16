import { eq, lt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { processedEvents } from '../db/schema.js';

const MAX_IDS = 10_000;

// How long a webhook body hash stays claimed. Plaid signs a body once and the
// signature is accepted for five minutes either side of `iat`
// (plaid/signature.ts MAX_AGE_SECONDS), so a captured delivery is replayable
// for exactly that long; ten minutes covers the whole of it plus the
// redelivery burst that follows a slow response. It is deliberately not
// permanent: a LIABILITIES or ITEM body carries no id and no timestamp, so a
// genuine update days later is byte-identical to this one and must not be
// swallowed.
const WEBHOOK_CLAIM_WINDOW_SECONDS = 10 * 60;

// Atomically claim an event id. Returns true if this caller won (i.e., the row
// was newly inserted); false if another caller already claimed it. Eliminates
// the check-then-act race that two reads + two writes would have.
export async function claimEvent(id: string): Promise<boolean> {
  const inserted = await db()
    .insert(processedEvents)
    .values({ id })
    .onConflictDoNothing()
    .returning({ id: processedEvents.id });

  if (inserted.length === 0) return false;

  await trimProcessedEvents();

  return true;
}

// Cap the table at MAX_IDS rows. FIFO eviction by processed_at.
async function trimProcessedEvents(): Promise<void> {
  await db().execute(sql`
    DELETE FROM ${processedEvents}
    WHERE id NOT IN (
      SELECT id FROM ${processedEvents} ORDER BY processed_at DESC LIMIT ${MAX_IDS}
    )
  `);
}

// Atomically claim a webhook delivery by body hash, for the handlers that are
// not idempotent on their own. Returns true if this caller won, false if the
// same body was already claimed inside WEBHOOK_CLAIM_WINDOW_SECONDS.
//
// The claim expires rather than lasting forever: the conflicting insert takes
// the row back when the existing claim is older than the window, in the same
// statement, so two concurrent redeliveries still cannot both win.
export async function claimWebhookDelivery(key: string, nowMs: number = Date.now()): Promise<boolean> {
  const now = new Date(nowMs);
  const cutoff = new Date(nowMs - WEBHOOK_CLAIM_WINDOW_SECONDS * 1000);

  const claimed = await db()
    .insert(processedEvents)
    .values({ id: key, processedAt: now })
    .onConflictDoUpdate({
      target: processedEvents.id,
      set: { processedAt: now },
      setWhere: lt(processedEvents.processedAt, cutoff),
    })
    .returning({ id: processedEvents.id });

  if (claimed.length === 0) return false;

  await trimProcessedEvents();

  return true;
}

// Drops a claim so a genuine Plaid redelivery can retry work that failed
// partway through. Mirrors the release in webhook/appstore.ts.
export async function releaseWebhookDelivery(key: string): Promise<void> {
  await db().delete(processedEvents).where(eq(processedEvents.id, key));
}

// Deletes processedEvents rows whose IDs correspond to transactions owned by
// this user. Two callers: the sandbox debug route, where it allows replay
// through the rule engine, and account deletion, where it is the only way to
// reach a table that has no user foreign key to cascade from (the ids are
// Plaid's own pseudonyms, but they are still a deleted user's activity).
// Must run before the user row is deleted: the ids are resolved through
// `transactions`, which cascades.
export async function clearUserEvents(userId: string): Promise<number> {
  const result = await db().execute(sql`
    DELETE FROM ${processedEvents}
    WHERE id IN (
      SELECT transaction_id FROM transactions WHERE user_id = ${userId}
    )
  `);
  // drizzle execute returns postgres.js result; rowCount lives on the raw result
  // biome-ignore lint/suspicious/noExplicitAny: driver-level result shape varies by adapter
  return (result as any).rowCount ?? (result as any).count ?? 0;
}
