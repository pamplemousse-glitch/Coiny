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
    const otherId = await findOrCreateUser({ appleSub: 'other_user_sub', email: 'other@coiny.test' });
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

  it('does not touch another user’s goal', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { createGoal, getGoal } = await import('../src/store/target-goals.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_user_sub', email: 'other@coiny.test' });
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
