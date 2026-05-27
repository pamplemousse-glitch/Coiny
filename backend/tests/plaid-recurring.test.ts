import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('GET /api/plaid/recurring', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns empty arrays when no streams are stored', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/plaid/recurring', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ inflow: unknown[]; outflow: unknown[] }>();
    expect(body.inflow).toEqual([]);
    expect(body.outflow).toEqual([]);

    await app.close();
  });

  it('returns stored streams after upsert', async () => {
    const { upsertRecurringStreams } = await import('../src/store/plaid-recurring.js');

    await upsertRecurringStreams(
      testUserId,
      [
        {
          stream_id: 'inflow-1',
          account_id: 'acct-1',
          merchant_name: 'Employer Inc',
          description: 'Paycheck',
          frequency: 'WEEKLY',
          average_amount: { amount: 2400 },
          last_amount: { amount: 2400 },
          last_date: '2026-05-19',
          is_user_modified: false,
          status: 'MATURE',
        },
      ],
      [
        {
          stream_id: 'outflow-1',
          account_id: 'acct-1',
          merchant_name: 'Netflix',
          description: 'Netflix subscription',
          frequency: 'MONTHLY',
          average_amount: { amount: 15.99 },
          last_amount: { amount: 15.99 },
          last_date: '2026-05-01',
          is_user_modified: false,
          status: 'MATURE',
        },
      ],
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/plaid/recurring', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{
      inflow: Array<{ streamId: string; merchantName: string | null; frequency: string }>;
      outflow: Array<{ streamId: string; merchantName: string | null; frequency: string }>;
    }>();
    expect(body.inflow).toHaveLength(1);
    expect(body.inflow[0]?.streamId).toBe('inflow-1');
    expect(body.inflow[0]?.merchantName).toBe('Employer Inc');
    expect(body.inflow[0]?.frequency).toBe('WEEKLY');

    expect(body.outflow).toHaveLength(1);
    expect(body.outflow[0]?.streamId).toBe('outflow-1');
    expect(body.outflow[0]?.merchantName).toBe('Netflix');
    expect(body.outflow[0]?.frequency).toBe('MONTHLY');

    await app.close();
  });

  it('returns 401 without auth token', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/plaid/recurring' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('upsert overwrites existing stream on second call', async () => {
    const { upsertRecurringStreams } = await import('../src/store/plaid-recurring.js');

    const stream = {
      stream_id: 'inflow-2',
      account_id: 'acct-2',
      merchant_name: 'Employer Inc',
      description: 'Paycheck',
      frequency: 'BIWEEKLY',
      average_amount: { amount: 1200 },
      last_amount: { amount: 1200 },
      last_date: '2026-05-10',
      is_user_modified: false,
      status: 'MATURE' as string | null,
    };

    await upsertRecurringStreams(testUserId, [stream], []);
    await upsertRecurringStreams(
      testUserId,
      [{ ...stream, last_date: '2026-05-24', last_amount: { amount: 1300 } }],
      [],
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/plaid/recurring', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ inflow: Array<{ lastDate: string | null; lastAmount: string | null }> }>();
    expect(body.inflow).toHaveLength(1);
    expect(body.inflow[0]?.lastDate).toBe('2026-05-24');

    await app.close();
  });
});
