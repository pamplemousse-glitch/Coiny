// The retention purge (docs/legal/data-disposal-schedule.md, FTC Safeguards
// 16 CFR 314.4(c)(6), PRD R-22.3). The schedule is the written artefact; this
// is the job that executes it. Until it existed the true retention for every
// category was "forever, or until the account is deleted", which is not what
// the privacy policy section 4 tells the user.
//
// It runs on the scheduler's tick (R-16.2 owns every timer in this codebase),
// gated to once a day: the schedule calls it a nightly pass and none of these
// windows is measured in minutes.
//
// Every unit is a bounded DELETE against a timestamp column, so two instances
// racing is harmless: the second one finds nothing. Each purge logs counts
// only, never contents, per the schedule's Mechanics section.
//
// DELIBERATELY NOT HERE, both because they need a decision rather than code:
//
//   Plaid transactions, recurring streams and the balance cache, "90 days
//     after the item is removed". Open item B7 has not settled the 90, and
//     there is no disconnect timestamp to measure it from: unlinking deletes
//     the item row (the credential must not survive it), so nothing records
//     when the item went away. Storing a disconnect marker is a schema change
//     and a product decision about what a reconnect within the window should
//     find, so it stays unbuilt and named rather than guessed at.
//   Inactive accounts, "warning email at 12 months, deletion at 15". Deleting
//     a paying-or-lapsed user's account unprompted needs the warning email
//     first, and no transactional email path exists.

import { lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  analyticsEvents,
  crashDiagnostics,
  discogsPending,
  notificationLog,
  opsEvents,
  reactionHistory,
  sessions,
  spinwheelPending,
} from '../db/schema.js';
import { pruneExpiredTombstones, TOMBSTONE_RETENTION_DAYS } from '../store/deleted-users.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Windows from the schedule's table. One constant per row so a change there is
 *  a one-line change here, and the two can be diffed by eye. */
export const RETENTION = {
  /** Dead the moment the OAuth/OTP handshake finishes or is abandoned. */
  pendingHandshakeMs: 24 * HOUR_MS,
  /** The push budget only ever looks back one week. */
  notificationLogMs: 90 * DAY_MS,
  /** The pet's memory does not need to outlive a year. */
  reactionHistoryMs: 365 * DAY_MS,
  /** Cohort analysis at this scale never needs more. */
  analyticsEventsMs: 365 * DAY_MS,
  /** Operational events (store/ops.ts). Ninety days is long enough to answer
   *  "has this vendor been flaky all quarter", which is the longest question
   *  anyone asks of it, and short enough that an unbounded failure loop cannot
   *  grow the table without limit. Shorter than analytics deliberately: these
   *  rows are about vendors, not people, so nothing about them gets more
   *  valuable with age. */
  opsEventsMs: 90 * DAY_MS,
  /** MetricKit crash and hang diagnostics (store/crash-diagnostics.ts). Same
   *  ninety days as ops_events and for the same reason: these rows describe a
   *  BUILD, not a person, so nothing about them gets more valuable with age,
   *  and a crash on a build from last quarter is not actionable. Shorter than
   *  analytics deliberately. */
  crashDiagnosticsMs: 90 * DAY_MS,
  // Deletion tombstones are NOT here. Their window is the backup retention
  // window, not a privacy window chosen from the schedule, so it lives beside
  // the table in store/deleted-users.ts (TOMBSTONE_RETENTION_DAYS) where the
  // reasoning that ties it to R-20.1's 30 days can be read. Pruning still runs
  // as part of this pass; only the number lives elsewhere.
} as const;

export const PURGE_INTERVAL_MS = DAY_MS;

export type PurgeSummary = {
  sessions: number;
  pendingHandshakes: number;
  notifications: number;
  reactions: number;
  analytics: number;
  opsEvents: number;
  crashDiagnostics: number;
  /** Deletion tombstones dropped because no surviving backup is old enough to
   *  resurrect the account they name (store/deleted-users.ts). */
  tombstones: number;
};

let lastPurgeAt: Date | null = null;

/** Test seam: the daily gate is process state, so a test that runs two ticks
 *  has to be able to clear it. */
export function resetPurgeSchedule(): void {
  lastPurgeAt = null;
}

export function isPurgeDue(now: Date): boolean {
  return lastPurgeAt === null || now.getTime() - lastPurgeAt.getTime() >= PURGE_INTERVAL_MS;
}

/**
 * Executes every retention window the schedule states and this codebase can
 * anchor to a timestamp. Never throws: a purge failure is an operational
 * problem, not a reason to lose the rest of the tick.
 *
 * Counts come from `returning()` rather than a driver row count because the
 * two drivers (PGlite in tests, Neon in production) report affected rows under
 * different names. Each delete is age-bounded, so after the first run the
 * returned set is a day's worth of rows.
 */
export async function runRetentionPurge(now: Date = new Date()): Promise<PurgeSummary> {
  const before = (ms: number): Date => new Date(now.getTime() - ms);

  // Sessions are already unusable past expires_at (validation checks it); this
  // stops the table accumulating them, which is the open note in R-15.3.
  const expiredSessions = await db().delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });

  const handshakeCutoff = before(RETENTION.pendingHandshakeMs);
  const discogs = await db()
    .delete(discogsPending)
    .where(lt(discogsPending.createdAt, handshakeCutoff))
    .returning({ userId: discogsPending.userId });
  const spinwheel = await db()
    .delete(spinwheelPending)
    .where(lt(spinwheelPending.createdAt, handshakeCutoff))
    .returning({ userId: spinwheelPending.userId });

  const notifications = await db()
    .delete(notificationLog)
    .where(lt(notificationLog.sentAt, before(RETENTION.notificationLogMs)))
    .returning({ id: notificationLog.id });

  const reactions = await db()
    .delete(reactionHistory)
    .where(lt(reactionHistory.at, before(RETENTION.reactionHistoryMs)))
    .returning({ id: reactionHistory.id });

  const analytics = await db()
    .delete(analyticsEvents)
    .where(lt(analyticsEvents.serverTs, before(RETENTION.analyticsEventsMs)))
    .returning({ id: analyticsEvents.id });

  const ops = await db()
    .delete(opsEvents)
    .where(lt(opsEvents.at, before(RETENTION.opsEventsMs)))
    .returning({ id: opsEvents.id });

  const crashes = await db()
    .delete(crashDiagnostics)
    .where(lt(crashDiagnostics.receivedAt, before(RETENTION.crashDiagnosticsMs)))
    .returning({ id: crashDiagnostics.id });

  // A tombstone stops being useful once no backup old enough to resurrect that
  // user survives. Keeping them past that turns the record of a deletion into a
  // permanent list of everyone who ever left, which is the thing the deletion
  // was supposed to end.
  const tombstones = await pruneExpiredTombstones(TOMBSTONE_RETENTION_DAYS, now);

  lastPurgeAt = now;

  return {
    sessions: expiredSessions.length,
    pendingHandshakes: discogs.length + spinwheel.length,
    notifications: notifications.length,
    reactions: reactions.length,
    analytics: analytics.length,
    opsEvents: ops.length,
    crashDiagnostics: crashes.length,
    tombstones,
  };
}
