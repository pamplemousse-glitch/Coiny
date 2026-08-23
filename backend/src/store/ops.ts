// Operational events: the durable half of "something is broken".
//
// `docs/incident-response.md` says the quiet part plainly: nothing alerts, and
// discovery would realistically come from a user or a security researcher.
// `asset_class_cache.consecutive_failures` exists, but it is a COUNTER, so it
// can drive backoff and nothing else. A connection can sit at fifty consecutive
// failures indefinitely and the only symptom is a number that quietly stopped
// moving. You cannot alert on a counter, chart it, or ask it when the trouble
// started. You can ask all three of a history.
//
// ---------------------------------------------------------------------------
// Why this is not analytics, and why that matters more than it looks
// ---------------------------------------------------------------------------
//
// `store/analytics.ts` already exists and is the wrong home, for two reasons
// that pull in opposite directions and are both disqualifying.
//
//   It is CONSENT-GATED. `trackServerEvent` writes zero rows for a user who
//   turned usage sharing off. A vendor outage is not a fact about any
//   individual, so letting one person's analytics preference decide whether we
//   can see it is incoherent: a single opt-out would blind us to an outage
//   affecting everyone.
//
//   It is USER-SCOPED, and `analytics_events.user_id` is `notNull`. There is no
//   user to attribute "Zerion has been failing for six hours" to.
//
// So this table has no user column at all. That is not an omission to be fixed
// later: it is what allows the table to be exempt from the consent gate with a
// straight face, and it is the same argument that lets the Sentry row in
// `legal/service-providers.md` read "no customer information".
//
// ---------------------------------------------------------------------------
// What goes in `detail`
// ---------------------------------------------------------------------------
//
// Counts, codes, and identifiers of NON-PERSONAL things: an asset class, a task
// name, a vendor hostname. Never a balance, never an address, never an
// institution name. The redaction policy in `plugins/logger.ts` is the floor;
// this is stricter, because a log line ages out of Fly's retention and a row
// here lives for the ninety days the disposal schedule gives it.

import { and, desc, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { opsEvents } from '../db/schema.js';
import { log } from '../util/log.js';

/** The closed set of things worth recording. Closed on purpose: a free-form
 *  `kind` becomes unqueryable within a month, and the health rollup groups on
 *  it. Add a member here before emitting one. */
export const OPS_EVENT_KINDS = [
  /** A scheduled per-class refresh failed against a vendor. The common case,
   *  and the one `consecutiveFailures` could only count. */
  'class_refresh_failed',
  /** A scheduled maintenance task threw: the removal drain, the health sweep,
   *  the retention purge. Ours to fix, not a vendor's. */
  'task_failed',
  /** The retry budget stopped retrying a vendor (resilience/retry-budget.ts).
   *  The earliest durable signal that a vendor is down for everybody rather
   *  than for one user. */
  'vendor_throttled',
  /** A fetched value failed a plausibility check against the value it replaced
   *  (resilience/invariants.ts). The write still happened: this is an alert to
   *  us, never an error to the user. */
  'invariant_violated',
  /** The vendor-level circuit breaker ejected a vendor
   *  (resilience/circuit-breaker.ts). Stronger than `vendor_throttled`: the
   *  budget only stops RETRYING, this stops calling the vendor at all, so it is
   *  the first signal that refreshes are being skipped rather than merely
   *  slowed. The breaker's state is in-process and dies with the machine, which
   *  is exactly why the ejection is written down here. */
  'vendor_circuit_opened',
] as const;

export type OpsEventKind = (typeof OPS_EVENT_KINDS)[number];

export type OpsEventInput = {
  severity: 'warn' | 'error';
  kind: OpsEventKind;
  vendor?: string | null;
  errorClass?: string | null;
  detail?: Record<string, unknown>;
};

/**
 * Record one operational event. Never throws.
 *
 * Best-effort for the same reason `trackServerEvent` is: an observability
 * failure must not break the operation that triggered it. The asymmetry is
 * deliberate and worth keeping in mind when reading a rollup, because it means
 * an empty result can mean "nothing broke" or "the database is the thing that
 * broke". `/health/integrations` cannot distinguish those, and the scheduler
 * heartbeat on `/health/scheduler` is what covers the second case.
 */
export async function recordOpsEvent(input: OpsEventInput): Promise<void> {
  try {
    await db()
      .insert(opsEvents)
      .values({
        severity: input.severity,
        kind: input.kind,
        vendor: input.vendor ?? null,
        errorClass: input.errorClass ?? null,
        detail: input.detail ?? {},
      });
  } catch {
    // Names only, never the payload, and never the caught error: this runs on
    // failure paths where the error itself is the vendor's.
    log.warn(`ops: failed to persist event '${input.kind}'`);
  }
}

export type VendorFailureRollup = {
  /** Vendor hostname, or the asset class where no hostname was known. */
  key: string;
  failures: number;
  lastAt: string;
  lastErrorClass: string | null;
};

/**
 * Failures grouped by vendor-or-class over a window, worst first.
 *
 * `COALESCE(vendor, detail->>'asset_class')` because the two emitters know
 * different things: `util/fetch.ts` knows the hostname, while
 * `store/asset-cache.ts` sits above the vendor clients and only knows which
 * asset class was being refreshed. Rolling them into one key is honest, since
 * both answer the same question, and it avoids a rollup where the same outage
 * appears twice under two names.
 */
export async function vendorFailureRollup(since: Date): Promise<VendorFailureRollup[]> {
  const key = sql<string>`coalesce(${opsEvents.vendor}, ${opsEvents.detail}->>'asset_class', 'unknown')`;
  const rows = await db()
    .select({
      key,
      failures: sql<number>`count(*)::int`,
      lastAt: sql<string>`max(${opsEvents.at})`,
      lastErrorClass: sql<string | null>`(array_agg(${opsEvents.errorClass} order by ${opsEvents.at} desc))[1]`,
    })
    .from(opsEvents)
    .where(and(gte(opsEvents.at, since), sql`${opsEvents.severity} in ('warn','error')`))
    .groupBy(key)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({
    key: r.key,
    failures: r.failures,
    lastAt: new Date(r.lastAt).toISOString(),
    lastErrorClass: r.lastErrorClass ?? null,
  }));
}
