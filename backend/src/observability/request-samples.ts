// Sampled request latency, and the percentiles that make it useful.
//
// Runbook G1.22, audit rows 4.5.3 and 4.13.4. `engineering-budgets.md` §1
// states every latency budget as a p95 and says the aggregation happens by
// piping `fly logs` through a percentile script "until the telemetry table
// exists". No such script exists, and Fly's rolling buffer has no query
// interface, so a weekly p95 could not be reconstructed after the fact: every
// latency number in that document was an intention rather than a measurement.
//
// ---------------------------------------------------------------------------
// Why not analytics_events, which the audit recommended
// ---------------------------------------------------------------------------
//
// Row 4.13.4 recommends "add responseTime and route to an analytics_events row
// on a sampled fraction of requests". The instinct is right, the table is not,
// and this codebase already wrote down why in `store/ops.ts`:
//
//   `analytics_events` is CONSENT-GATED. `trackServerEvent` writes nothing for
//   a user who turned usage sharing off, so a single opt-out would blind us to
//   our own p95. A request duration is not a fact about a person, and letting
//   one person's preference decide whether we can measure the server is the
//   same incoherence that argument rejects for vendor outages.
//
//   `analytics_events.user_id` is NOT NULL. Storing route plus timestamp
//   against a user id is a behavioural trail: which screens someone opened and
//   when. Collecting a browsing history in order to answer "how fast is the
//   API" is a bad trade even when the data is first-party.
//
// So the substrate is a table with no user column, which is exactly the shape
// `ops_events` uses and for exactly the same reason. It stays first-party, adds
// no processor to `docs/legal/service-providers.md`, and leaves the decision in
// `docs/launch-gap-analysis.md` §1 item 9 closed.
//
// ---------------------------------------------------------------------------
// Why raw samples rather than a rolling aggregate
// ---------------------------------------------------------------------------
//
// A percentile cannot be averaged, so an aggregate table would have to store a
// histogram and every future question would be limited to the buckets chosen
// today. At thirty testers the raw rows are small enough that the exact answer
// is affordable, and the retention purge keeps them from becoming otherwise.
// If the volume ever stops being small, the sampling rate is one config value.

import { and, gte, lt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { requestSamples } from '../db/schema.js';
import { log } from '../util/log.js';

export type RequestSample = {
  /** The route PATTERN Fastify matched, never the resolved URL. */
  route: string;
  method: string;
  status: number;
  durationMs: number;
};

/**
 * Record one sampled request. Never throws.
 *
 * Best-effort for the same reason `recordOpsEvent` is: measuring a request must
 * never be able to fail it. The asymmetry means an empty result can mean "no
 * traffic" or "the database is the thing that is slow", which is worth
 * remembering when a percentile query comes back empty during an incident.
 */
export async function recordRequestSample(sample: RequestSample, at?: Date): Promise<void> {
  try {
    await db()
      .insert(requestSamples)
      .values({
        route: sample.route,
        method: sample.method,
        status: sample.status,
        // Sub-millisecond precision is noise at these budgets, and an integer
        // column makes the percentile query a plain numeric one.
        durationMs: Math.max(0, Math.round(sample.durationMs)),
        ...(at ? { at } : {}),
      });
  } catch {
    // Route only, no timing: this runs on a path that is already degraded and
    // the point is that something failed, not how slowly.
    log.warn('request-samples: failed to persist a latency sample');
  }
}

export type RoutePercentiles = {
  route: string;
  method: string;
  samples: number;
  p50: number;
  p95: number;
  p99: number;
  maxMs: number;
};

/**
 * Percentiles per route over a window, slowest p95 first.
 *
 * `percentile_cont` rather than `percentile_disc`: with few samples the
 * discrete version snaps to whatever single request happened to land nearest
 * the rank, which at thirty testers is a number that moves for no reason.
 *
 * Errors are included. A 500 that takes eight seconds is the most important
 * latency sample of the week, and excluding it would make the p95 look best
 * exactly when the service is worst.
 */
export async function routeLatency(since: Date, until?: Date): Promise<RoutePercentiles[]> {
  const window = until
    ? and(gte(requestSamples.at, since), lt(requestSamples.at, until))
    : gte(requestSamples.at, since);

  const rows = await db()
    .select({
      route: requestSamples.route,
      method: requestSamples.method,
      samples: sql<number>`count(*)::int`,
      p50: sql<number>`percentile_cont(0.5) within group (order by ${requestSamples.durationMs})::float`,
      p95: sql<number>`percentile_cont(0.95) within group (order by ${requestSamples.durationMs})::float`,
      p99: sql<number>`percentile_cont(0.99) within group (order by ${requestSamples.durationMs})::float`,
      maxMs: sql<number>`max(${requestSamples.durationMs})::int`,
    })
    .from(requestSamples)
    .where(window)
    .groupBy(requestSamples.route, requestSamples.method)
    .orderBy(sql`percentile_cont(0.95) within group (order by ${requestSamples.durationMs}) desc`);

  return rows.map((r) => ({
    route: r.route,
    method: r.method,
    samples: r.samples,
    // Rounded on the way out: a percentile reported to six decimal places
    // implies a precision thirty samples do not have.
    p50: Math.round(r.p50),
    p95: Math.round(r.p95),
    p99: Math.round(r.p99),
    maxMs: r.maxMs,
  }));
}

/** Deletes samples older than the cutoff. Returns how many went. Called by the
 *  nightly retention pass rather than on a timer of its own. */
export async function pruneRequestSamples(before: Date): Promise<number> {
  const pruned = await db()
    .delete(requestSamples)
    .where(lt(requestSamples.at, before))
    .returning({ id: requestSamples.id });
  return pruned.length;
}

/**
 * p95 budgets per route, from `docs/engineering-budgets.md` §1.
 *
 * A budget nothing checks is a wish. These numbers have been in that document
 * since it was written, with the measurement column saying "`fly logs` through
 * a jq percentile script until the telemetry table exists". This is what turns
 * them into something a monitor can fail.
 *
 * ONE HONEST COMPROMISE, stated rather than hidden. §1 gives
 * `GET /api/net-worth` two different budgets: 400 ms for a cached read and 3 s
 * for a read that triggers a refresh. A sample carries the route, not whether
 * that particular request refreshed, so a single p95 over the window mixes both
 * populations. The looser number is used, because the stricter one would fire
 * on legitimate refresh-triggering reads and an alert that fires on correct
 * behaviour is one that gets muted. Splitting them needs a `refreshed` flag on
 * the sample, which is a follow-up and not a silent omission.
 */
export const LATENCY_BUDGET_MS: Record<string, number> = {
  'GET /api/net-worth': 3_000,
  // "200 in < 500 ms, always before processing". The handler replies and defers
  // via setImmediate, so this one is met by design and worth watching for the
  // day someone moves work above the reply.
  'POST /webhooks/plaid': 500,
};

/** Everything not named above. Generous on purpose: this is a floor that
 *  catches a route that has become pathological, not a target for tuning. */
export const DEFAULT_P95_BUDGET_MS = 1_000;

/** Samples a route needs in the window before its p95 is worth believing.
 *  Below this a single slow request IS the p95, and paging on one cold start
 *  is how a monitor gets ignored. */
export const MIN_SAMPLES_FOR_BUDGET = 20;

export type BudgetBreach = {
  route: string;
  method: string;
  samples: number;
  p95: number;
  budgetMs: number;
};

export function budgetFor(method: string, route: string): number {
  return LATENCY_BUDGET_MS[`${method} ${route}`] ?? DEFAULT_P95_BUDGET_MS;
}

/**
 * Routes whose p95 is over budget in the window, worst first.
 *
 * An EXCEPTION REPORT: a healthy system returns an empty list. That is the same
 * shape `/health/integrations` already uses, which is why this belongs there
 * rather than in a dashboard nobody opens.
 */
export async function breachedBudgets(since: Date, until?: Date): Promise<BudgetBreach[]> {
  const rows = await routeLatency(since, until);
  const breaches: BudgetBreach[] = [];
  for (const row of rows) {
    if (row.samples < MIN_SAMPLES_FOR_BUDGET) continue;
    const budgetMs = budgetFor(row.method, row.route);
    if (row.p95 <= budgetMs) continue;
    breaches.push({ route: row.route, method: row.method, samples: row.samples, p95: row.p95, budgetMs });
  }
  return breaches;
}
