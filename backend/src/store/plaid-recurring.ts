import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plaidRecurringStreams } from '../db/schema.js';
import type { RecurringStream } from '../plaid/types.js';

export type StoredStream = typeof plaidRecurringStreams.$inferSelect;

export async function upsertRecurringStreams(
  userId: string,
  inflow: RecurringStream[],
  outflow: RecurringStream[],
): Promise<void> {
  const now = new Date();

  const rows = [
    ...inflow.map((s) => ({
      streamId: s.stream_id,
      userId,
      accountId: s.account_id,
      direction: 'inflow' as const,
      merchantName: s.merchant_name ?? null,
      description: s.description,
      frequency: s.frequency,
      averageAmount: s.average_amount?.amount != null ? s.average_amount.amount.toString() : null,
      lastAmount: s.last_amount?.amount != null ? s.last_amount.amount.toString() : null,
      lastDate: s.last_date ?? null,
      isActive: s.status !== 'TOMBSTONED',
      updatedAt: now,
    })),
    ...outflow.map((s) => ({
      streamId: s.stream_id,
      userId,
      accountId: s.account_id,
      direction: 'outflow' as const,
      merchantName: s.merchant_name ?? null,
      description: s.description,
      frequency: s.frequency,
      averageAmount: s.average_amount?.amount != null ? s.average_amount.amount.toString() : null,
      lastAmount: s.last_amount?.amount != null ? s.last_amount.amount.toString() : null,
      lastDate: s.last_date ?? null,
      isActive: s.status !== 'TOMBSTONED',
      updatedAt: now,
    })),
  ];

  if (rows.length === 0) return;

  await db()
    .insert(plaidRecurringStreams)
    .values(rows)
    .onConflictDoUpdate({
      target: plaidRecurringStreams.streamId,
      set: {
        merchantName: sql`excluded.merchant_name`,
        description: sql`excluded.description`,
        frequency: sql`excluded.frequency`,
        averageAmount: sql`excluded.average_amount`,
        lastAmount: sql`excluded.last_amount`,
        lastDate: sql`excluded.last_date`,
        isActive: sql`excluded.is_active`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

export async function getRecurringStreams(
  userId: string,
): Promise<{ inflow: StoredStream[]; outflow: StoredStream[] }> {
  const rows = await db().select().from(plaidRecurringStreams).where(eq(plaidRecurringStreams.userId, userId));

  const inflow = rows.filter((r) => r.direction === 'inflow');
  const outflow = rows.filter((r) => r.direction === 'outflow');
  return { inflow, outflow };
}
