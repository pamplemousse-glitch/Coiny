// Tests for src/store/analytics.ts plus the server-side emission wiring:
// signup (store/users.ts), ladder transitions (store/goals.ts), guardrail
// periods (store/goals.ts), and item breakage (store/items.ts). Real SQL via
// PGlite; the database is never mocked.

import { readFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-13T00:00:00Z');

describe('insertAnalyticsEvents / listAnalyticsEvents', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists a batch and returns the stored count', async () => {
    const { insertAnalyticsEvents, listAnalyticsEvents } = await import('../src/store/analytics.js');

    const stored = await insertAnalyticsEvents(testUserId, [
      { event: 'app_open', properties: { source: 'icon', days_since_signup: 0 }, clientTs: NOW },
      { event: 'app_open', properties: { source: 'push', days_since_signup: 1 }, clientTs: null },
    ]);
    expect(stored).toBe(2);

    const rows = await listAnalyticsEvents(testUserId, 'app_open');
    expect(rows.length).toBe(2);
    expect(rows[0]?.properties).toEqual({ source: 'icon', days_since_signup: 0 });
    expect(rows[0]?.clientTs?.toISOString()).toBe(NOW.toISOString());
    expect(rows[1]?.clientTs).toBeNull();
  });

  it('scopes reads by userId: one user never sees another user events', async () => {
    const { insertAnalyticsEvents, listAnalyticsEvents } = await import('../src/store/analytics.js');
    const { findOrCreateUser } = await import('../src/store/users.js');

    const otherUserId = await findOrCreateUser({ appleSub: 'analytics_other_user', email: null });
    await insertAnalyticsEvents(otherUserId, [
      { event: 'app_open', properties: { source: 'icon', days_since_signup: 0 }, clientTs: null },
    ]);

    const rows = await listAnalyticsEvents(testUserId, 'app_open');
    expect(rows).toEqual([]);
  });

  it('returns zero for an empty batch without touching the database', async () => {
    const { insertAnalyticsEvents } = await import('../src/store/analytics.js');
    expect(await insertAnalyticsEvents(testUserId, [])).toBe(0);
  });
});

describe('trackServerEvent', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists a valid server event', async () => {
    const { trackServerEvent, listAnalyticsEvents } = await import('../src/store/analytics.js');

    await trackServerEvent(testUserId, 'push_sent', { type: 'paycheck' });

    const rows = await listAnalyticsEvents(testUserId, 'push_sent');
    expect(rows.length).toBe(1);
    expect(rows[0]?.properties).toEqual({ type: 'paycheck' });
  });

  it('drops an event whose properties fail the catalog, without throwing', async () => {
    const { trackServerEvent, listAnalyticsEvents } = await import('../src/store/analytics.js');

    // A merchant name can never be a push type: the token rule rejects it.
    await trackServerEvent(testUserId, 'push_sent', { type: 'Whole Foods Market' });

    const rows = await listAnalyticsEvents(testUserId, 'push_sent');
    expect(rows).toEqual([]);
  });
});

describe('signup_completed emission (store/users.ts)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('emits once on user creation with the sign-in method only', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    const userId = await findOrCreateUser({ googleSub: 'signup_google_sub', email: 'pii@example.com' });

    const rows = await listAnalyticsEvents(userId, 'signup_completed');
    expect(rows.length).toBe(1);
    expect(rows[0]?.properties).toEqual({ method: 'google' });
  });

  it('does not emit again for a returning sign-in', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    const userId = await findOrCreateUser({ appleSub: 'returning_apple_sub', email: null });
    const again = await findOrCreateUser({ appleSub: 'returning_apple_sub', email: null });
    expect(again).toBe(userId);

    const rows = await listAnalyticsEvents(userId, 'signup_completed');
    expect(rows.length).toBe(1);
  });
});

describe('ladder transition emission (store/goals.ts)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  const ctx = (over = {}) => ({
    hasConnectedAccount: true,
    essentialMonthly: 3000,
    incomeVolatility: 0.1,
    takeHomeMonthly: 6000,
    liquidCash: 50_000,
    savingsRate: 0.1,
    monthsAtSurplusRate: 0,
    highAprDebtBalances: [] as number[],
    investedTotal: 0,
    taxAdvantagedRate: 0,
    employerMatch: 'captured' as const,
    shelteredTargetRate: null,
    surplusTargetRate: null,
    ...over,
  });

  it('emits rung_completed on the completion edge', async () => {
    const { refreshLadder } = await import('../src/store/goals.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    await refreshLadder(testUserId, ctx(), NOW);

    const rows = await listAnalyticsEvents(testUserId, 'rung_completed');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.properties).toEqual({ rung_index: 0 });
  });

  it('does not re-emit rung_completed on an unchanged re-run', async () => {
    const { refreshLadder } = await import('../src/store/goals.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    await refreshLadder(testUserId, ctx(), NOW);
    const afterFirst = (await listAnalyticsEvents(testUserId, 'rung_completed')).length;

    await refreshLadder(testUserId, ctx(), NOW);
    const afterSecond = (await listAnalyticsEvents(testUserId, 'rung_completed')).length;
    expect(afterSecond).toBe(afterFirst);
  });

  it('emits rung_started when the active rung changes', async () => {
    const { refreshLadder } = await import('../src/store/goals.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    const first = await refreshLadder(testUserId, ctx(), NOW);

    const rows = await listAnalyticsEvents(testUserId, 'rung_started');
    expect(rows.length).toBe(1);
    expect(rows[0]?.properties).toEqual({ rung_index: first.currentRung });
  });
});

describe('recordGuardrailPeriod (store/goals.ts)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  const period = (over = {}) => ({
    guardrailKey: 'discretionary_weekly',
    periodStart: '2026-08-03',
    periodEnd: '2026-08-09',
    outcome: 'pending' as const,
    targetValue: 150,
    actualValue: null,
    repairUsed: false,
    ...over,
  });

  it('does not emit while a period is still pending', async () => {
    const { recordGuardrailPeriod } = await import('../src/store/goals.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    await recordGuardrailPeriod(testUserId, period(), NOW);

    expect(await listAnalyticsEvents(testUserId, 'guardrail_period_outcome')).toEqual([]);
  });

  it('emits guardrail_period_outcome once when the period settles', async () => {
    const { recordGuardrailPeriod, getGuardrailPeriods } = await import('../src/store/goals.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    await recordGuardrailPeriod(testUserId, period(), NOW);
    await recordGuardrailPeriod(testUserId, period({ outcome: 'passed', actualValue: 120 }), NOW);
    // Re-recording the same settled outcome must not double-emit.
    await recordGuardrailPeriod(testUserId, period({ outcome: 'passed', actualValue: 120 }), NOW);

    const rows = await listAnalyticsEvents(testUserId, 'guardrail_period_outcome');
    expect(rows.length).toBe(1);
    expect(rows[0]?.properties).toEqual({
      guardrail_key: 'discretionary_weekly',
      outcome: 'passed',
      repair_used: false,
    });

    // Upsert, not append: still exactly one row for the period.
    const stored = await getGuardrailPeriods(testUserId, 'discretionary_weekly');
    expect(stored.length).toBe(1);
    expect(stored[0]?.outcome).toBe('passed');
  });

  it('keeps amounts in goal_periods and out of the analytics event', async () => {
    const { recordGuardrailPeriod } = await import('../src/store/goals.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    await recordGuardrailPeriod(testUserId, period({ outcome: 'missed', actualValue: 210 }), NOW);

    const rows = await listAnalyticsEvents(testUserId, 'guardrail_period_outcome');
    expect(Object.keys(rows[0]?.properties ?? {}).sort()).toEqual(['guardrail_key', 'outcome', 'repair_used']);
  });
});

describe('item_state_changed emission (store/items.ts)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('emits revoked once when an item is first disabled', async () => {
    const { upsertItem, disableItem } = await import('../src/store/items.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    await upsertItem({ itemId: 'item_analytics_test', accessToken: 'access-sandbox-token', userId: testUserId });
    await disableItem('item_analytics_test');
    // Second disable is a no-op edge: no duplicate event.
    await disableItem('item_analytics_test');

    const rows = await listAnalyticsEvents(testUserId, 'item_state_changed');
    expect(rows.length).toBe(1);
    expect(rows[0]?.properties).toEqual({ state: 'revoked' });
  });

  it('does not emit for an unknown item id', async () => {
    const { disableItem } = await import('../src/store/items.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');

    await disableItem('item_that_does_not_exist');

    expect(await listAnalyticsEvents(testUserId, 'item_state_changed')).toEqual([]);
  });
});

describe('backend/queries/retention.sql', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // R-2.1 demands the saved query match the W4 definition token for token; the
  // cheapest guard against rot is that the file always runs against the real
  // schema. PGlite is real Postgres, so a rename or syntax slip fails here.
  it('executes against the live schema and computes a W4 cohort end to end', async () => {
    const { db } = await import('../src/db/client.js');
    const { insertAnalyticsEvents } = await import('../src/store/analytics.js');
    const { recordGuardrailPeriod } = await import('../src/store/goals.js');

    // Build one fully-retained user: signup 60 days ago, a rung completed in
    // week 1, an app_open on day 22, and a guardrail period passed in week 4.
    const day = (offset: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 60 + offset);
      return d;
    };
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    await db().execute(sql`
      UPDATE analytics_events SET server_ts = ${day(0).toISOString()}::timestamptz
      WHERE user_id = ${testUserId} AND event = 'signup_completed'
    `);
    await insertAnalyticsEvents(testUserId, [
      { event: 'rung_completed', properties: { rung_index: 0 }, clientTs: null },
      { event: 'app_open', properties: { source: 'icon', days_since_signup: 22 }, clientTs: null },
    ]);
    await db().execute(sql`
      UPDATE analytics_events SET server_ts = ${day(5).toISOString()}::timestamptz
      WHERE user_id = ${testUserId} AND event = 'rung_completed'
    `);
    await db().execute(sql`
      UPDATE analytics_events SET server_ts = ${day(22).toISOString()}::timestamptz
      WHERE user_id = ${testUserId} AND event = 'app_open'
    `);
    await recordGuardrailPeriod(
      testUserId,
      {
        guardrailKey: 'discretionary_weekly',
        periodStart: iso(day(18)),
        periodEnd: iso(day(24)),
        outcome: 'passed',
        targetValue: 150,
        actualValue: 100,
        repairUsed: false,
      },
      day(24),
    );

    const query = await readFile(new URL('../queries/retention.sql', import.meta.url), 'utf8');
    const result = await db().execute(sql.raw(query));
    // biome-ignore lint/suspicious/noExplicitAny: driver-level result shape varies by adapter
    const rows = ((result as any).rows ?? result) as Array<Record<string, unknown>>;

    expect(rows.length).toBe(1);
    expect(Number(rows[0]?.cohort_size)).toBe(1);
    expect(Number(rows[0]?.w4_retained)).toBe(1);
    // Retained users are not quiet completers: they opened the app in week 4.
    expect(Number(rows[0]?.quiet_completers)).toBe(0);
  });
});
