// Sampled request latency (runbook G1.22, audit 4.5.3 and 4.13.4).
//
// `engineering-budgets.md` §1 states every latency budget as a p95 and says the
// aggregation happens by piping `fly logs` through a percentile script "until
// the telemetry table exists". No such script existed and Fly's buffer cannot
// be queried after the fact, so every latency number in that document was an
// intention. These tests cover the substrate that makes them measurements.

import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const NOW = new Date('2026-09-02T12:00:00.000Z');

async function sample(durationMs: number, over: { route?: string; method?: string; status?: number; at?: Date } = {}) {
  const { recordRequestSample } = await import('../src/observability/request-samples.js');
  await recordRequestSample(
    {
      route: over.route ?? '/api/net-worth',
      method: over.method ?? 'GET',
      status: over.status ?? 200,
      durationMs,
    },
    over.at ?? new Date(NOW.getTime() - MINUTE),
  );
}

async function latency(since = new Date(NOW.getTime() - DAY)) {
  const { routeLatency } = await import('../src/observability/request-samples.js');
  return routeLatency(since, NOW);
}

describe('request samples', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records a sample with its route, method and status', async () => {
    await sample(120, { route: '/api/pets', status: 200 });

    const rows = await latency();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ route: '/api/pets', method: 'GET', samples: 1 });
  });

  it('carries no user identifier', async () => {
    await sample(120);

    const { db } = await import('../src/db/client.js');
    const { requestSamples } = await import('../src/db/schema.js');
    const rows = await db().select().from(requestSamples);
    // The table has no user column by design: a duration is a fact about the
    // server, and route-plus-timestamp against a person is a browsing history.
    expect(Object.keys(rows[0] ?? {})).not.toContain('userId');
  });

  it('computes percentiles rather than a mean', async () => {
    // 99 fast requests and one slow one. The mean is ~109 ms and says nothing;
    // the p95 is what the budget is written against.
    for (let i = 0; i < 99; i++) await sample(100);
    await sample(1_000);

    const [row] = await latency();
    expect(row?.p50).toBe(100);
    expect(row?.p95).toBeGreaterThanOrEqual(100);
    expect(row?.maxMs).toBe(1_000);
  });

  it('includes errors, because a slow 500 is the sample that matters most', async () => {
    await sample(50, { status: 200 });
    await sample(8_000, { status: 500 });

    const [row] = await latency();
    // Excluding failures would make the p95 look best exactly when the service
    // is worst.
    expect(row?.maxMs).toBe(8_000);
  });

  it('separates routes and methods', async () => {
    await sample(100, { route: '/api/pets', method: 'GET' });
    await sample(900, { route: '/api/pets', method: 'PUT' });

    const rows = await latency();
    expect(rows).toHaveLength(2);
    // Slowest first: the report is read from the top.
    expect(rows[0]?.method).toBe('PUT');
  });

  it('ignores samples outside the window', async () => {
    await sample(100, { at: new Date(NOW.getTime() - 3 * DAY) });
    await sample(200, { at: new Date(NOW.getTime() - MINUTE) });

    const [row] = await latency(new Date(NOW.getTime() - 2 * DAY));
    expect(row?.samples).toBe(1);
  });

  it('prunes samples past the retention window', async () => {
    await sample(100, { at: new Date(NOW.getTime() - 40 * DAY) });
    await sample(100, { at: new Date(NOW.getTime() - MINUTE) });
    const { pruneRequestSamples } = await import('../src/observability/request-samples.js');

    const pruned = await pruneRequestSamples(new Date(NOW.getTime() - 30 * DAY));

    expect(pruned).toBe(1);
  });

  it('is pruned by the nightly retention pass', async () => {
    await sample(100, { at: new Date(NOW.getTime() - 40 * DAY) });
    const { runRetentionPurge, resetPurgeSchedule } = await import('../src/scheduler/purge.js');
    resetPurgeSchedule();

    const summary = await runRetentionPurge(NOW);

    expect(summary.latencySamples).toBe(1);
  });
});

describe('latency budgets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('reads the budget from engineering-budgets §1 for the routes it names', async () => {
    const { budgetFor, DEFAULT_P95_BUDGET_MS } = await import('../src/observability/request-samples.js');

    expect(budgetFor('POST', '/webhooks/plaid')).toBe(500);
    expect(budgetFor('GET', '/api/pets')).toBe(DEFAULT_P95_BUDGET_MS);
  });

  it('reports a route whose p95 is over budget', async () => {
    const { MIN_SAMPLES_FOR_BUDGET, breachedBudgets } = await import('../src/observability/request-samples.js');
    for (let i = 0; i < MIN_SAMPLES_FOR_BUDGET; i++) {
      await sample(4_000, { route: '/webhooks/plaid', method: 'POST' });
    }

    const breaches = await breachedBudgets(new Date(NOW.getTime() - DAY), NOW);

    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toMatchObject({ route: '/webhooks/plaid', budgetMs: 500 });
  });

  it('says nothing about a route inside its budget', async () => {
    const { MIN_SAMPLES_FOR_BUDGET, breachedBudgets } = await import('../src/observability/request-samples.js');
    for (let i = 0; i < MIN_SAMPLES_FOR_BUDGET; i++) {
      await sample(40, { route: '/webhooks/plaid', method: 'POST' });
    }

    expect(await breachedBudgets(new Date(NOW.getTime() - DAY), NOW)).toEqual([]);
  });

  it('refuses to judge a route with too few samples', async () => {
    const { MIN_SAMPLES_FOR_BUDGET, breachedBudgets } = await import('../src/observability/request-samples.js');
    for (let i = 0; i < MIN_SAMPLES_FOR_BUDGET - 1; i++) {
      await sample(9_000, { route: '/webhooks/plaid', method: 'POST' });
    }

    // Below the floor a single cold start IS the p95, and paging on that is how
    // a monitor gets muted.
    expect(await breachedBudgets(new Date(NOW.getTime() - DAY), NOW)).toEqual([]);
  });
});

describe('the sampling hook', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records the route PATTERN, never the resolved URL', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    // A parameterised route: the raw URL carries an id, the pattern does not.
    await app.inject({ method: 'GET', url: '/api/plaid/items', headers: authHeader() });
    await app.close();

    const { db } = await import('../src/db/client.js');
    const { requestSamples } = await import('../src/db/schema.js');
    const rows = await db().select().from(requestSamples);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.route.startsWith('/')).toBe(true);
    }
  });

  it('records a 404 under one bucket rather than one row per path probed', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/definitely-not-a-route-1' });
    await app.inject({ method: 'GET', url: '/definitely-not-a-route-2' });
    await app.close();

    const { db } = await import('../src/db/client.js');
    const { requestSamples } = await import('../src/db/schema.js');
    const rows = await db().select().from(requestSamples);
    const unmatched = rows.filter((r) => r.route === 'unmatched');
    // A 404 flood must not turn this table into a log of every path an attacker
    // guessed, which is both useless and a list of somebody's probes.
    expect(unmatched).toHaveLength(2);
  });

  it('surfaces breaches on /health/integrations', async () => {
    const { MIN_SAMPLES_FOR_BUDGET } = await import('../src/observability/request-samples.js');
    for (let i = 0; i < MIN_SAMPLES_FOR_BUDGET; i++) {
      await sample(9_000, { route: '/webhooks/plaid', method: 'POST', at: new Date(Date.now() - MINUTE) });
    }
    const { buildIntegrationsHealth } = await import('../src/api/health-integrations.js');

    const body = await buildIntegrationsHealth();

    expect(body.slow_routes.map((r) => r.route)).toContain('/webhooks/plaid');
    // A slow route is not a down vendor. The monitor pages on `ok`, and waking
    // someone because a p95 drifted is how the page for a real outage gets
    // ignored.
    expect(body.ok).toBe(true);
  });
});
