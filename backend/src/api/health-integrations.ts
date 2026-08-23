// GET /health/integrations: is the number on someone's screen trustworthy?
//
// `docs/connection-resilience-survey.md` gap 5 is "nothing tells anyone", and
// Sentry does not close it. Sentry catches an EXCEPTION, and the failure mode
// that actually hurts here is an ABSENCE: a vendor quietly returning failures
// for six hours while every request completes, every handler returns 200, and
// the only symptom is a total that stopped moving. There is no exception to
// catch. That gap needs a reader, not a reporter.
//
// ---------------------------------------------------------------------------
// Why an endpoint rather than an alerting integration
// ---------------------------------------------------------------------------
//
// `/health/scheduler` already established the pattern, deliberately separate
// from Fly's own check so an external pinger can watch it without holding the
// API hostage. Runbook T3 already calls for a free UptimeRobot monitor. So the
// transport, the schedule and the notification channel all exist and cost
// nothing; this is one more URL for the same monitor to watch. No new vendor,
// nothing to add to `legal/service-providers.md`, no DPA.
//
// ---------------------------------------------------------------------------
// Two sources, because they answer different questions
// ---------------------------------------------------------------------------
//
//   The retry budget (`resilience/retry-budget.ts`) is IN MEMORY and answers
//   "right now": which vendors are currently throttled. It is exact and it
//   dies with the process.
//
//   `ops_events` is DURABLE and answers "what has been happening": failures per
//   vendor over a window, surviving deploys and restarts.
//
// A deploy resets the first and not the second, which is the right shape: a
// vendor that has failed 200 times today is still worth knowing about after a
// restart, and a throttle that a restart cleared is genuinely no longer true.
//
// ---------------------------------------------------------------------------
// Unauthenticated, deliberately, and shaped for it
// ---------------------------------------------------------------------------
//
// A free uptime monitor polls a URL; making it authenticate is friction for no
// gain. The body is therefore summary-level by construction: vendor hostnames
// (every one already named in the privacy policy), counts, and programmatic
// error classes. No user, no balance, no institution, and nothing that is not
// already public. `store/ops.ts` guarantees the row contents; this endpoint
// does not re-derive that guarantee, it inherits it.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { openBreakers } from '../resilience/circuit-breaker.js';
import { retryBudgetStats } from '../resilience/retry-budget.js';
import { vendorFailureRollup } from '../store/ops.js';

/** How far back the durable half looks. Long enough that an overnight outage is
 *  still visible when someone looks in the morning, short enough that last
 *  week's resolved incident is not still firing the monitor. */
export const HEALTH_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Failures against one vendor inside the window before it reads `down`.
 *
 *  A threshold rather than "any failure at all", because vendors fail
 *  transiently all day and a monitor that pages on the first blip gets muted,
 *  at which point it may as well not exist. This is the same judgement
 *  `scheduler/plaid-health.ts` makes when it refuses to move an item's
 *  lifecycle state on a rate limit. */
export const DOWN_FAILURE_THRESHOLD = 10;

export type IntegrationHealth = {
  key: string;
  status: 'ok' | 'degraded' | 'down';
  failures: number;
  lastAt: string | null;
  lastErrorClass: string | null;
  /** From the in-memory retry budget: retries are currently being refused. */
  throttled: boolean;
  /** From the in-memory circuit breaker: the vendor is EJECTED, so calls are
   *  not being made at all. Strictly worse than `throttled`, which only stops
   *  the retries, and the distinction is the point: throttled means slower,
   *  ejected means skipped. */
  ejected: boolean;
};

export type IntegrationsHealthBody = {
  ok: boolean;
  window_ms: number;
  /** Vendors in trouble, worst first. A healthy system returns an empty list,
   *  which is the point: this is an exception report, not an inventory. */
  integrations: IntegrationHealth[];
};

/**
 * Build the rollup. Exported so tests assert the logic rather than the wiring.
 */
export async function buildIntegrationsHealth(now: Date = new Date()): Promise<IntegrationsHealthBody> {
  const since = new Date(now.getTime() - HEALTH_WINDOW_MS);
  const rollup = await vendorFailureRollup(since);
  const throttled = new Map(retryBudgetStats().map((s) => [s.vendor, s]));

  const byKey = new Map<string, IntegrationHealth>();

  for (const row of rollup) {
    byKey.set(row.key, {
      key: row.key,
      status: row.failures >= DOWN_FAILURE_THRESHOLD ? 'down' : 'degraded',
      failures: row.failures,
      lastAt: row.lastAt,
      lastErrorClass: row.lastErrorClass,
      throttled: throttled.get(row.key)?.throttled ?? false,
      ejected: false,
    });
  }

  // A vendor the budget is currently throttling is `down` whatever the durable
  // count says. The budget only refuses retries after ten retryable failures,
  // so by the time it engages the question is settled, and this covers the case
  // where a restart cleared the ops history but the vendor is still dead.
  for (const [vendor, stats] of throttled) {
    if (!stats.throttled) continue;
    const existing = byKey.get(vendor);
    if (existing) {
      existing.status = 'down';
      existing.throttled = true;
      continue;
    }
    byKey.set(vendor, {
      key: vendor,
      status: 'down',
      failures: stats.localFailures + stats.upstreamFailures,
      lastAt: null,
      lastErrorClass: null,
      throttled: true,
      ejected: false,
    });
  }

  // An EJECTED vendor is `down` unconditionally, and for a stronger reason than
  // throttling: the breaker is refusing the calls, so the absence of fresh
  // failures in `ops_events` is caused by the control rather than by recovery.
  // Reading that silence as health is exactly the muted-alarm failure this
  // whole surface exists to prevent.
  for (const s of openBreakers()) {
    const existing = byKey.get(s.vendor);
    if (existing) {
      existing.status = 'down';
      existing.ejected = true;
      continue;
    }
    byKey.set(s.vendor, {
      key: s.vendor,
      status: 'down',
      failures: s.localFailures + s.upstreamFailures,
      lastAt: null,
      lastErrorClass: s.lastTrip,
      throttled: throttled.get(s.vendor)?.throttled ?? false,
      ejected: true,
    });
  }

  const integrations = [...byKey.values()].sort((a, b) => b.failures - a.failures || a.key.localeCompare(b.key));

  return {
    ok: integrations.every((i) => i.status !== 'down'),
    window_ms: HEALTH_WINDOW_MS,
    integrations,
  };
}

export function registerIntegrationsHealth(app: FastifyInstance): void {
  app.get('/health/integrations', async (_req, reply: FastifyReply) => {
    let body: IntegrationsHealthBody;
    try {
      body = await buildIntegrationsHealth();
    } catch {
      // The database is how this endpoint sees anything, so losing it means the
      // answer is unknown rather than healthy. 503 is the honest reply, and it
      // is the same reply the monitor already understands.
      return reply.status(503).send({ ok: false, window_ms: HEALTH_WINDOW_MS, integrations: [], error: 'unavailable' });
    }

    // 503 so a free uptime monitor needs no body parsing and no scripting: the
    // status code IS the alert. Anything richer is for a human who follows the
    // link after being paged.
    if (!body.ok) return reply.status(503).send(body);
    return body;
  });
}
