import { eq, inArray, lt, sql } from 'drizzle-orm';
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

// Ceiling on ids per INSERT. Postgres caps a statement at 65535 bound
// parameters and this binds one per id, so the real limit is far higher; the
// point of chunking is to keep a single statement's memory and parse time
// bounded when a Plaid initial sync arrives with thousands of transactions.
const CLAIM_CHUNK = 1_000;

// Atomically claim an event id. Returns true if this caller won (i.e., the row
// was newly inserted); false if another caller already claimed it. Eliminates
// the check-then-act race that two reads + two writes would have.
export async function claimEvent(id: string): Promise<boolean> {
  return (await claimEvents([id])).has(id);
}

/**
 * Claim many event ids in one round trip. Returns the subset this caller won,
 * exactly as if `claimEvent` had been called for each id, and with the same
 * race-freedom: the winner is decided by the unique index, not by a read.
 *
 * Exists because `webhook/plaid.ts` claimed one id per round trip inside a
 * loop over every transaction in the sync (audit 4.7.10), and a Plaid initial
 * sync routinely carries 500 to 2,000. The per-id cost was worse than one
 * round trip, because every successful claim also ran `trimProcessedEvents`,
 * a DELETE with an ORDER BY ... LIMIT subquery over the whole table. So the
 * old shape was ~2N statements, N of them the expensive one, against a 60 s
 * processing budget on a 256 MB shared CPU. This is ~2 statements total.
 *
 * Ids are de-duplicated first. `ON CONFLICT DO NOTHING` tolerates a repeated
 * id within one VALUES list, unlike DO UPDATE, but the returned set must
 * reflect ids rather than rows, and deduplicating is how that stays true.
 */
export async function claimEvents(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids)];
  const claimed = new Set<string>();
  if (unique.length === 0) return claimed;

  for (let i = 0; i < unique.length; i += CLAIM_CHUNK) {
    const chunk = unique.slice(i, i + CLAIM_CHUNK);
    const inserted = await db()
      .insert(processedEvents)
      .values(chunk.map((id) => ({ id })))
      .onConflictDoNothing()
      .returning({ id: processedEvents.id });

    for (const row of inserted) claimed.add(row.id);
  }

  // Once for the whole batch rather than once per claim. FIFO eviction does
  // not care whether it runs after one insert or a thousand.
  if (claimed.size > 0) await trimProcessedEvents();

  return claimed;
}

/**
 * Give back claims that were taken but whose work did not complete.
 *
 * Claiming a batch up front changes what a mid-batch failure means. With the
 * old per-id claim, an exception on transaction 5 left 6 onwards unclaimed, so
 * a Plaid redelivery picked them up. Claiming all of them first would instead
 * mark them processed while their reactions never ran, and the redelivery
 * would skip them silently. Releasing the unprocessed remainder restores the
 * original guarantee.
 */
export async function releaseEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db().delete(processedEvents).where(inArray(processedEvents.id, ids));
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
