// Persistence for MetricKit crash and hang diagnostics (G3.10).
//
// Deliberately NOT consent-gated, unlike store/analytics.ts, and the reasoning
// is worth stating because the two tables look similar.
//
// `trackServerEvent` writes zero rows for a user who turned usage sharing off,
// which is right for product analytics: those events are facts about a person's
// behaviour. A crash is a fact about a BUILD. It carries no behaviour, no
// amounts and no identifiers beyond the account it arrived on, and letting one
// person's analytics preference decide whether a crash in the shipped binary is
// visible would blind us to a defect affecting everyone.
//
// That said, the client still gates it: `TelemetryConsent` covers the whole
// telemetry surface on device, so a user who has opted out sends nothing. The
// server not gating it a second time is what keeps the two questions separate
// rather than a way around the first.

import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { crashDiagnostics } from '../db/schema.js';
import { log } from '../util/log.js';

export type CrashDiagnosticKind = 'crash' | 'hang' | 'disk_write' | 'cpu_exception' | 'app_launch';

export type CrashDiagnosticInput = {
  kind: CrashDiagnosticKind;
  appBuild: number;
  osMajor: number;
  signature: string;
  exceptionType: number | null;
  exceptionCode: number | null;
  signal: number | null;
  callStack: Record<string, unknown>;
};

/** Insert a batch for one user. Returns rows written.
 *
 *  `userId` is always stamped from the session, never from the payload, so a
 *  device cannot file a crash against somebody else's account (BOLA rule #6). */
export async function insertCrashDiagnostics(userId: string, rows: CrashDiagnosticInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const written = await db()
    .insert(crashDiagnostics)
    .values(
      rows.map((r) => ({
        userId,
        kind: r.kind,
        appBuild: r.appBuild,
        osMajor: r.osMajor,
        signature: r.signature,
        exceptionType: r.exceptionType,
        exceptionCode: r.exceptionCode,
        signal: r.signal,
        callStack: r.callStack,
      })),
    )
    .returning({ id: crashDiagnostics.id });
  return written.length;
}

export type CrashGroup = {
  signature: string;
  kind: string;
  appBuild: number;
  occurrences: number;
  affectedUsers: number;
  lastAt: string;
};

/**
 * Crashes grouped by signature, worst first.
 *
 * This is the only question worth asking of this table, and it is the reason
 * `signature` exists at all: "47 crashes" is a number, "one crash, 47 times,
 * on build 321" is a lead. `affectedUsers` separates one user in a bad loop
 * from a defect everybody is hitting, which is the distinction that decides
 * whether to ship a fix today.
 */
export async function crashGroups(since: Date, limit = 50): Promise<CrashGroup[]> {
  const rows = await db()
    .select({
      signature: crashDiagnostics.signature,
      kind: crashDiagnostics.kind,
      appBuild: crashDiagnostics.appBuild,
      occurrences: sql<number>`count(*)::int`,
      affectedUsers: sql<number>`count(distinct ${crashDiagnostics.userId})::int`,
      lastAt: sql<string>`max(${crashDiagnostics.receivedAt})`,
    })
    .from(crashDiagnostics)
    .where(sql`${crashDiagnostics.receivedAt} >= ${since}`)
    .groupBy(crashDiagnostics.signature, crashDiagnostics.kind, crashDiagnostics.appBuild)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((r) => ({
    signature: r.signature,
    kind: r.kind,
    appBuild: r.appBuild,
    occurrences: r.occurrences,
    affectedUsers: r.affectedUsers,
    lastAt: new Date(r.lastAt).toISOString(),
  }));
}

/** One signature's stored call stacks, newest first, for symbolication. */
export async function callStacksForSignature(signature: string, limit = 5): Promise<Record<string, unknown>[]> {
  const rows = await db()
    .select({ callStack: crashDiagnostics.callStack })
    .from(crashDiagnostics)
    .where(eq(crashDiagnostics.signature, signature))
    .orderBy(desc(crashDiagnostics.receivedAt))
    .limit(limit);
  return rows.map((r) => r.callStack);
}

/** Retention sweep (scheduler/purge.ts). Never throws: a purge failure must not
 *  abort the tick that runs it. */
export async function purgeCrashDiagnostics(before: Date): Promise<number> {
  try {
    const deleted = await db()
      .delete(crashDiagnostics)
      .where(and(lt(crashDiagnostics.receivedAt, before)))
      .returning({ id: crashDiagnostics.id });
    return deleted.length;
  } catch {
    log.warn('purge: failed to delete expired crash diagnostics');
    return 0;
  }
}
