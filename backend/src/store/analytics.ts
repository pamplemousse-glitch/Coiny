// Persistence for first-party analytics events (docs/prd.md R-24.1).
//
// Two write paths:
//   - insertAnalyticsEvents: the batched /api/telemetry endpoint, pre-validated
//     against the client catalog.
//   - trackServerEvent: server-side emission of facts the backend observes
//     itself (signup, ladder transitions, guardrail outcomes, item breakage,
//     push sends). Never throws: an analytics failure must never break the
//     domain operation that triggered it.

import { and, asc, eq } from 'drizzle-orm';
import { SERVER_EVENT_SCHEMAS, type ServerEventName } from '../analytics/events.js';
import { db } from '../db/client.js';
import { analyticsEvents, users } from '../db/schema.js';
import { log } from '../util/log.js';

export type AnalyticsEventRow = typeof analyticsEvents.$inferSelect;

export type AnalyticsEventInput = {
  event: string;
  properties: Record<string, unknown>;
  clientTs: Date | null;
};

/** The consent gate, read fresh on every write.
 *
 *  The check lives here rather than in the two callers because the client
 *  toggle only ever silenced the client queue: `trackServerEvent` has no client
 *  and would keep writing signup, ladder, guardrail, item and push events for a
 *  user who turned collection off. This is the one function both paths share.
 *
 *  Reads the column directly rather than going through store/users.ts, which
 *  imports this module for `trackServerEvent`. */
async function isAnalyticsOptedOut(userId: string): Promise<boolean> {
  const rows = await db().select({ optOut: users.analyticsOptOut }).from(users).where(eq(users.id, userId));
  return rows[0]?.optOut ?? false;
}

/** Insert a pre-validated batch for one user. Returns the number of rows
 *  written, which is zero when the user has usage sharing switched off.
 *  Callers validate against the catalog BEFORE calling; this function trusts
 *  its input shape but always stamps the given userId, so a payload can never
 *  write into another user's history. */
export async function insertAnalyticsEvents(userId: string, events: AnalyticsEventInput[]): Promise<number> {
  if (events.length === 0) return 0;
  if (await isAnalyticsOptedOut(userId)) return 0;
  const rows = await db()
    .insert(analyticsEvents)
    .values(
      events.map((e) => ({
        userId,
        event: e.event,
        properties: e.properties,
        clientTs: e.clientTs ?? null,
      })),
    )
    .returning({ id: analyticsEvents.id });
  return rows.length;
}

/** Read back one user's events, oldest first, optionally filtered by name.
 *  Scoped by userId (BOLA rule #6). */
export async function listAnalyticsEvents(userId: string, event?: string): Promise<AnalyticsEventRow[]> {
  const where = event
    ? and(eq(analyticsEvents.userId, userId), eq(analyticsEvents.event, event))
    : eq(analyticsEvents.userId, userId);
  return db().select().from(analyticsEvents).where(where).orderBy(asc(analyticsEvents.id));
}

/** Record a server-observed event. Validates against the server catalog as
 *  defense in depth (a typo'd property never reaches storage), and swallows
 *  every failure: emission is strictly best-effort. Logs event names only,
 *  never properties (.claude/rules/security.md #2). */
export async function trackServerEvent(
  userId: string,
  event: ServerEventName,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const parsed = SERVER_EVENT_SCHEMAS[event].safeParse(properties);
    if (!parsed.success) {
      log.warn(`analytics: dropped server event '${event}': properties failed the catalog schema`);
      return;
    }
    await insertAnalyticsEvents(userId, [
      { event, properties: parsed.data as Record<string, unknown>, clientTs: null },
    ]);
  } catch {
    log.warn(`analytics: failed to persist server event '${event}'`);
  }
}
