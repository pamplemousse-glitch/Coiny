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
