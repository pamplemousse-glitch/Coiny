// ops_events and /health/integrations.
//
// The claim under test is not "the endpoint returns JSON". It is that a vendor
// failing quietly now produces a 503 on a URL a free uptime monitor already
// watches, and that the row it wrote contains nothing about a person.

import { beforeEach, describe, expect, it } from 'vitest';
import { buildIntegrationsHealth, DOWN_FAILURE_THRESHOLD } from '../src/api/health-integrations.js';
import { db } from '../src/db/client.js';
import { opsEvents } from '../src/db/schema.js';
import { resetRetryBudgets } from '../src/resilience/retry-budget.js';
import { buildApp } from '../src/server.js';
import { recordClassFailure } from '../src/store/asset-cache.js';
import { recordOpsEvent, vendorFailureRollup } from '../src/store/ops.js';
import { resetDatabase, testUserId } from './db-helper.js';

beforeEach(async () => {
  await resetDatabase();
  resetRetryBudgets();
});

describe('recordOpsEvent', () => {
  it('writes a row with no user column to put a user in', async () => {
    await recordOpsEvent({ severity: 'warn', kind: 'class_refresh_failed', detail: { asset_class: 'crypto' } });

    const rows = await db().select().from(opsEvents);
    expect(rows).toHaveLength(1);
    // The structural guarantee, asserted rather than trusted: there is no
    // user_id key on the row at all, so nothing can drift into putting one
    // there. This is what lets the table skip the analytics consent gate.
    expect(Object.keys(rows[0]!)).not.toContain('userId');
    expect(Object.keys(rows[0]!)).not.toContain('user_id');
  });

  it('never throws, so an observability failure cannot break the operation', async () => {
    // A kind outside the closed set still has to not throw: the caller is on a
    // failure path already, and a throw here would replace a recorded vendor
    // failure with an unrecorded crash.
    await expect(
      recordOpsEvent({ severity: 'error', kind: 'task_failed', detail: { task: 'whatever' } }),
    ).resolves.toBeUndefined();
  });
});

describe('recordClassFailure', () => {
  it('emits an ops event from the one chokepoint every vendor failure passes', async () => {
    // Seven call sites in networth/refresh.ts funnel through this function.
    // Emitting here rather than at each of them is why none can be forgotten.
    await recordClassFailure(testUserId, 'crypto', 'vendor_5xx');

    const rows = await db().select().from(opsEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('class_refresh_failed');
    expect(rows[0]?.errorClass).toBe('vendor_5xx');
    expect(rows[0]?.detail).toMatchObject({ asset_class: 'crypto' });
  });

  it('records a history, not a counter, so "when did this start" is answerable', async () => {
    // The distinction the survey draws: consecutive_failures could only ever
    // say "fifty". This can say when the fifty began.
    for (let i = 0; i < 3; i++) await recordClassFailure(testUserId, 'defi', 'timeout');

    const rows = await db().select().from(opsEvents);
    expect(rows).toHaveLength(3);
  });

  it('still records the failure on the cache row, unchanged', async () => {
    // The ops event is additive. The backoff that asset_class_cache drives must
    // keep working exactly as before.
    await recordClassFailure(testUserId, 'crypto', 'vendor_5xx');
    const { getClassCache } = await import('../src/store/asset-cache.js');
    const cache = await getClassCache(testUserId);
    expect(cache.get('crypto')?.consecutiveFailures).toBe(1);
  });
});

describe('vendorFailureRollup', () => {
  it('groups a hostname and an asset class into one key each, worst first', async () => {
    await recordOpsEvent({ severity: 'warn', kind: 'vendor_throttled', vendor: 'api.zerion.io' });
    await recordOpsEvent({ severity: 'warn', kind: 'vendor_throttled', vendor: 'api.zerion.io' });
    await recordOpsEvent({ severity: 'warn', kind: 'class_refresh_failed', detail: { asset_class: 'crypto' } });

    const rollup = await vendorFailureRollup(new Date(Date.now() - 60_000));
    expect(rollup.map((r) => r.key)).toEqual(['api.zerion.io', 'crypto']);
    expect(rollup[0]?.failures).toBe(2);
  });

  it('ignores events outside the window', async () => {
    await recordOpsEvent({ severity: 'warn', kind: 'class_refresh_failed', detail: { asset_class: 'crypto' } });
    const rollup = await vendorFailureRollup(new Date(Date.now() + 60_000));
    expect(rollup).toEqual([]);
  });
});

describe('buildIntegrationsHealth', () => {
  it('is an exception report: a healthy system lists nothing', async () => {
    const body = await buildIntegrationsHealth();
    expect(body.ok).toBe(true);
    expect(body.integrations).toEqual([]);
  });

  it('reads degraded below the threshold and does not alert', async () => {
    await recordClassFailure(testUserId, 'crypto', 'timeout');

    const body = await buildIntegrationsHealth();
    expect(body.ok).toBe(true);
    expect(body.integrations[0]).toMatchObject({ key: 'crypto', status: 'degraded', failures: 1 });
  });

  it('reads down at the threshold, which is what turns the monitor red', async () => {
    for (let i = 0; i < DOWN_FAILURE_THRESHOLD; i++) await recordClassFailure(testUserId, 'crypto', 'timeout');

    const body = await buildIntegrationsHealth();
    expect(body.ok).toBe(false);
    expect(body.integrations[0]).toMatchObject({ status: 'down', failures: DOWN_FAILURE_THRESHOLD });
  });

  it('surfaces a vendor the retry budget is throttling even with no durable history', async () => {
    // The case a restart creates: the ops rows were purged or the vendor only
    // just died, but the in-memory budget knows retries are being refused.
    const { recordFailure } = await import('../src/resilience/retry-budget.js');
    for (let i = 0; i < 20; i++) recordFailure('dead.example', 'upstream');

    const body = await buildIntegrationsHealth();
    expect(body.ok).toBe(false);
    expect(body.integrations.find((i) => i.key === 'dead.example')).toMatchObject({ status: 'down', throttled: true });
  });
});

describe('GET /health/integrations', () => {
  it('is unauthenticated, because a free uptime monitor polls a URL', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health/integrations' });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, integrations: [] });
  });

  it('503s when a vendor is down, so the status code alone is the alert', async () => {
    for (let i = 0; i < DOWN_FAILURE_THRESHOLD; i++) await recordClassFailure(testUserId, 'crypto', 'timeout');

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health/integrations' });
    await app.close();

    // No body parsing, no scripting: this is the whole integration contract
    // with the monitor.
    expect(res.statusCode).toBe(503);
    expect(res.json().ok).toBe(false);
  });

  it('exposes nothing beyond what the privacy policy already names', async () => {
    await recordClassFailure(testUserId, 'crypto', 'timeout');

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health/integrations' });
    await app.close();

    const body = res.payload;
    expect(body).not.toContain(testUserId);
    expect(body).not.toContain('user_id');
  });
});
