import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-13T00:00:00Z');

function body(over = {}) {
  return {
    name: 'Emergency fund',
    kind: 'save',
    targetAmountUsd: 5_000,
    targetDate: '2027-06-01',
    fundingAccountId: 'acct-goal',
    ...over,
  };
}

type TestApp = Awaited<ReturnType<typeof import('../src/server.js')['buildApp']>>;

async function createViaApi(app: TestApp, over = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/goals',
    headers: { ...authHeader(), 'content-type': 'application/json' },
    body: JSON.stringify(body(over)),
  });
}

describe('POST /api/goals', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates a goal with the R-7.7 defaults applied', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await createViaApi(app);
    expect(res.statusCode).toBe(201);
    const goal = res.json();
    expect(goal.countsExistingBalance).toBe(true);
    expect(goal.contributionRule.type).toBe('recurring');
    expect(goal.recurringAnnual).toBe(false);
    expect(goal.pace).toBeNull();

    await app.close();
  });

  it('emits goal_created with the bucketed band, never the amount (R-24.2)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    expect((await createViaApi(app)).statusCode).toBe(201);

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const events = await listAnalyticsEvents(testUserId, 'goal_created');
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toEqual({
      kind: 'save',
      target_band: '1k-10k',
      has_target_date: true,
      contribution_rule: 'recurring',
    });
    // The privacy invariant, asserted directly: no property carries the raw
    // 5000, the goal name, or the emoji.
    expect(JSON.stringify(events[0]?.properties)).not.toContain('5000');
    expect(JSON.stringify(events[0]?.properties)).not.toContain('Emergency');

    await app.close();
  });

  it('returns the specific limit error for a fourth active goal', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    for (let i = 0; i < 3; i++) {
      expect((await createViaApi(app, { name: `Goal ${i}` })).statusCode).toBe(201);
    }
    const fourth = await createViaApi(app, { name: 'One too many' });
    expect(fourth.statusCode).toBe(409);
    expect(fourth.json()).toMatchObject({ error: 'goal_limit_reached', limit: 3 });

    await app.close();
  });

  it('rejects an invalid kind', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await createViaApi(app, { kind: 'yolo' });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('rejects recurringAnnual without a target date', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await createViaApi(app, { recurringAnnual: true, targetDate: null });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/goals',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body()),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /api/goals', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lists goals with the max-active cap', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await createViaApi(app);
    const res = await app.inject({ method: 'GET', url: '/api/goals', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.goals).toHaveLength(1);
    expect(json.maxActive).toBe(3);

    await app.close();
  });

  it('hides archived goals unless includeArchived is set', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const created = (await createViaApi(app)).json();
    await app.inject({ method: 'DELETE', url: `/api/goals/${created.id}`, headers: authHeader() });

    const plain = await app.inject({ method: 'GET', url: '/api/goals', headers: authHeader() });
    expect(plain.json().goals).toHaveLength(0);
    const all = await app.inject({ method: 'GET', url: '/api/goals?includeArchived=true', headers: authHeader() });
    expect(all.json().goals).toHaveLength(1);

    await app.close();
  });
});

describe('GET /api/goals/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 404 for another user’s goal', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { createGoal } = await import('../src/store/target-goals.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_user_sub' });
    const theirs = await createGoal(
      otherId,
      {
        name: 'Not yours',
        emoji: null,
        kind: 'save',
        targetAmountUsd: 100,
        targetDate: null,
        fundingAccountId: null,
        countsExistingBalance: true,
        contributionRule: { type: 'recurring', amountUsd: null, cadence: null, dayOfMonth: null },
        recurringAnnual: false,
      },
      NOW,
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/api/goals/${(theirs as { id: number }).id}`,
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('returns 400 for a non-numeric id', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/goals/abc', headers: authHeader() });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('PATCH /api/goals/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('updates the target amount', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const created = (await createViaApi(app)).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/goals/${created.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ targetAmountUsd: 7_500 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().targetAmountUsd).toBe(7_500);

    await app.close();
  });

  it('emits goal_edited with field names only, never the values (R-24.2)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const created = (await createViaApi(app)).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/goals/${created.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'House deposit', targetAmountUsd: 25_000 }),
    });
    expect(res.statusCode).toBe(200);

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const events = await listAnalyticsEvents(testUserId, 'goal_edited');
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toEqual({ kind: 'save', fields_changed: ['name', 'target_amount'] });
    expect(JSON.stringify(events[0]?.properties)).not.toContain('House');
    expect(JSON.stringify(events[0]?.properties)).not.toContain('25000');

    await app.close();
  });

  it('refuses to strip the date from a recurring annual goal', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const created = (await createViaApi(app, { recurringAnnual: true })).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/goals/${created.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ targetDate: null }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 404 for an unknown id', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/goals/99999',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost' }),
    });
    expect(res.statusCode).toBe(404);

    await app.close();
  });
});

describe('DELETE /api/goals/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('archives rather than destroys', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const created = (await createViaApi(app)).json();
    const res = await app.inject({ method: 'DELETE', url: `/api/goals/${created.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const { getGoal } = await import('../src/store/target-goals.js');
    const stored = await getGoal(testUserId, created.id);
    expect(stored?.archivedAt).not.toBeNull();

    await app.close();
  });

  it('emits goal_archived once, even when the delete is repeated (R-24.2)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const created = (await createViaApi(app)).json();
    expect(
      (await app.inject({ method: 'DELETE', url: `/api/goals/${created.id}`, headers: authHeader() })).statusCode,
    ).toBe(204);
    // Idempotent repeat: still 204, but no second analytics row.
    expect(
      (await app.inject({ method: 'DELETE', url: `/api/goals/${created.id}`, headers: authHeader() })).statusCode,
    ).toBe(204);

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const events = await listAnalyticsEvents(testUserId, 'goal_archived');
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toEqual({ kind: 'save' });

    await app.close();
  });

  it('does not touch another user’s goal', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { createGoal, getGoal } = await import('../src/store/target-goals.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_user_sub' });
    const theirs = await createGoal(
      otherId,
      {
        name: 'Not yours',
        emoji: null,
        kind: 'save',
        targetAmountUsd: 100,
        targetDate: null,
        fundingAccountId: null,
        countsExistingBalance: true,
        contributionRule: { type: 'recurring', amountUsd: null, cadence: null, dayOfMonth: null },
        recurringAnnual: false,
      },
      NOW,
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'DELETE', url: `/api/goals/${(theirs as { id: number }).id}`, headers: authHeader() });
    const after = await getGoal(otherId, (theirs as { id: number }).id);
    expect(after?.archivedAt).toBeNull();

    await app.close();
  });
});

describe('GET /api/goals/guardrails', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns the seven launch guardrails with two banked repair tokens', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/goals/guardrails', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const { guardrails } = res.json();
    expect(guardrails).toHaveLength(7);
    for (const guardrail of guardrails) {
      expect(guardrail.repairTokens).toBe(2);
      expect(guardrail.streak).toBe(0);
    }

    await app.close();
  });

  it('names the reason for guardrails without a data source', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/goals/guardrails', headers: authHeader() });
    const { guardrails } = res.json();
    const sourceless = guardrails.filter((g: { unavailableReason: string | null }) => g.unavailableReason !== null);
    expect(sourceless.map((g: { key: string }) => g.key).sort()).toEqual([
      'debt_principal_paid',
      'utilization_before_close',
    ]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/goals/guardrails' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /api/goals/ladder/rungs/:rungId/skip', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function seedLadder() {
    const { saveLadderState } = await import('../src/store/goals.js');
    await saveLadderState(
      testUserId,
      {
        currentRung: 1,
        rungs: {
          '0': { status: 'completed', completedAt: NOW.toISOString() },
          '1': { status: 'active' },
          '2': { status: 'pending' },
          '3': { status: 'pending' },
          '4': { status: 'pending' },
          '5': { status: 'pending' },
          '6': { status: 'pending' },
          '7': { status: 'pending' },
        },
      },
      NOW,
    );
  }

  async function skip(app: TestApp, rungId: number, over = {}) {
    return app.inject({
      method: 'POST',
      url: `/api/goals/ladder/rungs/${rungId}/skip`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'skipped', reason: 'handled_elsewhere', ...over }),
    });
  }

  it('skips a rung, stores the reason, and re-elects the active rung', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await seedLadder();

    const res = await skip(app, 1);
    expect(res.statusCode).toBe(200);
    const view = res.json();
    expect(view.rungs['1']).toEqual({ status: 'skipped', skippedReason: 'handled_elsewhere' });
    expect(view.currentRung).toBe(2);

    await app.close();
  });

  it('emits rung_skipped with the reason token', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await seedLadder();

    await skip(app, 2, { reason: 'not_relevant' });
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const events = await listAnalyticsEvents(testUserId, 'rung_skipped');
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toEqual({ rung_index: 2, skip_reason: 'not_relevant' });

    await app.close();
  });

  it('accepts not_applicable without a reason', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await seedLadder();

    const res = await skip(app, 2, { status: 'not_applicable', reason: null });
    expect(res.statusCode).toBe(200);
    expect(res.json().rungs['2']).toEqual({ status: 'not_applicable' });

    await app.close();
  });

  it('rejects a skip without a stated reason (R-7.4)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await seedLadder();

    const res = await skip(app, 2, { reason: null });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('refuses to skip a completed rung: the completion stands', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await seedLadder();

    const res = await skip(app, 0);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'rung_not_skippable' });

    await app.close();
  });

  it('answers 409 ladder_not_ready before the pipeline has ever run', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await skip(app, 1);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'ladder_not_ready' });

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/goals/ladder/rungs/1/skip',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'skipped', reason: 'not_now' }),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('DELETE /api/goals/ladder/rungs/:rungId/skip', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('reverses a skip and re-elects the rung as active', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const { saveLadderState } = await import('../src/store/goals.js');
    await saveLadderState(
      testUserId,
      {
        currentRung: 2,
        rungs: {
          '0': { status: 'completed', completedAt: NOW.toISOString() },
          '1': { status: 'skipped', skippedReason: 'not_now' },
          '2': { status: 'active' },
          '3': { status: 'pending' },
          '4': { status: 'pending' },
          '5': { status: 'pending' },
          '6': { status: 'pending' },
          '7': { status: 'pending' },
        },
      },
      NOW,
    );

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/goals/ladder/rungs/1/skip',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const view = res.json();
    expect(view.rungs['1']?.status).toBe('active');
    expect(view.currentRung).toBe(1);

    await app.close();
  });

  it('answers 409 for a rung that is not opted out', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const { saveLadderState } = await import('../src/store/goals.js');
    await saveLadderState(testUserId, { currentRung: 0, rungs: { '0': { status: 'active' } } }, NOW);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/goals/ladder/rungs/0/skip',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'rung_not_skipped' });

    await app.close();
  });
});
