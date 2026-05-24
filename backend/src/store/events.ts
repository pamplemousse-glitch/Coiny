import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { processedEvents } from '../db/schema.js';

const MAX_IDS = 10_000;

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

  // Cap the table at MAX_IDS rows. FIFO eviction by processed_at.
  await db().execute(sql`
    DELETE FROM ${processedEvents}
    WHERE id NOT IN (
      SELECT id FROM ${processedEvents} ORDER BY processed_at DESC LIMIT ${MAX_IDS}
    )
  `);

  return true;
}

// Sandbox-only. Deletes processedEvents rows whose IDs correspond to
// transactions owned by this user, allowing replay through the rule engine.
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
