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

import { and, desc, eq, gte, sql } from 'drizzle-orm';
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
  /** The SAME plausibility violation hit the same asset class for several
   *  accounts inside one window.
   *
   *  This is the distinction `resilience/invariants.ts` says it cannot make
   *  from inside one account, and it is right: one person's crypto going to
   *  near-zero is one person selling. Several people's crypto doing it within
   *  the hour is a deploy or a vendor. Recorded at `error` rather than `warn`
   *  because the individual violations are already warnings and the whole point
   *  of this row is that it means something the warnings do not. */
  'invariant_breadth',
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

/**
 * Record one plausibility violation, and escalate when it is not the first of
 * its kind in the window.
 *
 * `resilience/invariants.ts` states the limit it cannot pass: a 99% drop is
 * indistinguishable, from inside a single account, from a vendor bug, and
 * "only breadth across many accounts tells them apart". This is that breadth
 * check. It cannot live in `invariants.ts`, which is a pure function over two
 * numbers by design, and it cannot live at the call site, which knows about one
 * user.
 *
 * COUNTS EVENTS, NOT USERS, and the difference is worth being honest about.
 * `ops_events` has no user column, deliberately (see the header), so there is
 * nothing to count distinctly. The proxy holds because a violation is a
 * TRANSITION and not a state: once a collapsed value is stored, the next
 * refresh compares against the collapsed value and does not fire again. So one
 * account contributes one event per real change, and several events in an hour
 * really are several accounts almost all of the time.
 *
 * Emits at most one breadth row per window per (class, violation): the alert is
 * that the threshold was crossed, and repeating it for every subsequent user
 * turns one signal into a page of them.
 *
 * Never throws, for the same reason `recordOpsEvent` does not.
 */
export async function recordInvariantViolation(input: {
  assetClass: string;
  violation: string;
  detail: Record<string, unknown>;
  breadthThreshold: number;
  windowMinutes: number;
  now?: Date;
}): Promise<void> {
  await recordOpsEvent({
    severity: 'warn',
    kind: 'invariant_violated',
    errorClass: input.violation,
    detail: { asset_class: input.assetClass, ...input.detail },
  });

  try {
    const now = input.now ?? new Date();
    const since = new Date(now.getTime() - input.windowMinutes * 60 * 1000);

    const [counts] = await db()
      .select({
        violations: sql<number>`count(*) filter (where ${opsEvents.kind} = 'invariant_violated')::int`,
        alreadyAlerted: sql<number>`count(*) filter (where ${opsEvents.kind} = 'invariant_breadth')::int`,
      })
      .from(opsEvents)
      .where(
        and(
          gte(opsEvents.at, since),
          eq(opsEvents.errorClass, input.violation),
          sql`${opsEvents.detail}->>'asset_class' = ${input.assetClass}`,
        ),
      );

    if (!counts) return;
    if (counts.alreadyAlerted > 0) return;
    if (counts.violations < input.breadthThreshold) return;

    await recordOpsEvent({
      severity: 'error',
      kind: 'invariant_breadth',
      errorClass: input.violation,
      detail: {
        asset_class: input.assetClass,
        occurrences: counts.violations,
        window_minutes: input.windowMinutes,
      },
    });
  } catch {
    // The violation itself is already recorded. Losing the escalation is worse
    // than losing nothing and better than losing the warning it escalates.
    log.warn('ops: failed to evaluate invariant breadth');
  }
}
