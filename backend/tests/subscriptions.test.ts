import { beforeEach, describe, expect, it } from 'vitest';
import type { StoredStream } from '../src/store/plaid-recurring.js';
import { monthlyFactor, summarize, toRecurringItem } from '../src/subscriptions/recurring.js';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

function stream(overrides: Partial<StoredStream>): StoredStream {
  return {
    streamId: 'str_1',
    userId: testUserId,
    accountId: 'acc_1',
    direction: 'outflow',
    merchantName: 'Spotify',
    description: 'SPOTIFY USA',
    frequency: 'MONTHLY',
    averageAmount: '10.99',
    lastAmount: '10.99',
    lastDate: '2026-08-01',
    isActive: true,
    updatedAt: new Date(),
    ...overrides,
  } as StoredStream;
}

describe('monthlyFactor', () => {
  // 52/12 and 26/12, not 4 and 2. Four-week months understate a weekly charge
  // by about 8%, which is exactly the kind of quiet error that makes a
  // spending total untrustworthy.
  it('uses real year fractions for weekly and biweekly', () => {
    expect(monthlyFactor('WEEKLY')).toBeCloseTo(4.3333, 3);
    expect(monthlyFactor('BIWEEKLY')).toBeCloseTo(2.1667, 3);
  });

  it('handles the calendar cadences', () => {
    expect(monthlyFactor('SEMI_MONTHLY')).toBe(2);
    expect(monthlyFactor('MONTHLY')).toBe(1);
    expect(monthlyFactor('ANNUALLY')).toBeCloseTo(1 / 12, 6);
  });

  it('refuses to guess at an unknown cadence', () => {
    expect(monthlyFactor('UNKNOWN')).toBeNull();
    expect(monthlyFactor('something Plaid added later')).toBeNull();
  });
});

describe('toRecurringItem', () => {
  // The whole reason for the rewrite: the old detector required a 25-35 day
  // gap, so a yearly charge could not be represented at all.
  it('converts an annual subscription to a monthly cost', () => {
    const item = toRecurringItem(stream({ frequency: 'ANNUALLY', averageAmount: '120' }));
    expect(item.amount).toBe(120);
    expect(item.monthlyAmount).toBeCloseTo(10, 6);
  });

  it('leaves monthlyAmount null when the cadence is unknown', () => {
    const item = toRecurringItem(stream({ frequency: 'UNKNOWN' }));
    expect(item.amount).toBe(10.99);
    expect(item.monthlyAmount).toBeNull();
  });

  it('falls back to the bank description when Plaid has no merchant', () => {
    const item = toRecurringItem(stream({ merchantName: null, description: 'ACH DEBIT 4411' }));
    expect(item.name).toBe('ACH DEBIT 4411');
  });

  it('prefers the average amount over the most recent one', () => {
    // A promotional or partial first month would otherwise misreport the
    // ongoing cost of the subscription.
    const item = toRecurringItem(stream({ averageAmount: '15.00', lastAmount: '0.99' }));
    expect(item.amount).toBe(15);
  });

  it('reports amounts as positive regardless of sign convention', () => {
    expect(toRecurringItem(stream({ averageAmount: '-10.99' })).amount).toBe(10.99);
  });

  it('survives a stream with no amount at all', () => {
    const item = toRecurringItem(stream({ averageAmount: null, lastAmount: null }));
    expect(item.amount).toBe(0);
    expect(item.monthlyAmount).toBe(0);
  });
});

describe('summarize', () => {
  it('totals mixed cadences on a common monthly basis', () => {
    const result = summarize({
      outflow: [
        stream({ streamId: 's1', frequency: 'MONTHLY', averageAmount: '10' }),
        stream({ streamId: 's2', frequency: 'ANNUALLY', averageAmount: '120' }),
        stream({ streamId: 's3', frequency: 'WEEKLY', averageAmount: '5' }),
      ],
      inflow: [],
    });
    // 10 + 10 + 21.67
    expect(result.monthlyOutflowTotal).toBeCloseTo(41.6667, 3);
  });

  it('drops cancelled streams', () => {
    // Plaid tombstones a stream when it stops. A cancelled subscription that
    // kept appearing as a live charge would be actively misleading.
    const result = summarize({
      outflow: [stream({ streamId: 's1' }), stream({ streamId: 's2', isActive: false })],
      inflow: [],
    });
    expect(result.outflow.map((i) => i.id)).toEqual(['s1']);
  });

  it('keeps inflows separate from outflows and totals them apart', () => {
    const result = summarize({
      outflow: [stream({ streamId: 's1', averageAmount: '10' })],
      inflow: [stream({ streamId: 's2', direction: 'inflow', averageAmount: '3000', merchantName: 'ACME PAYROLL' })],
    });
    expect(result.monthlyOutflowTotal).toBe(10);
    expect(result.monthlyInflowTotal).toBe(3000);
    expect(result.inflow[0]?.name).toBe('ACME PAYROLL');
  });

  it('excludes unknown cadences from the total and says how many', () => {
    // A total that silently omits rows is the same defect as a balance that
    // silently omits an account.
    const result = summarize({
      outflow: [
        stream({ streamId: 's1', frequency: 'MONTHLY', averageAmount: '10' }),
        stream({ streamId: 's2', frequency: 'UNKNOWN', averageAmount: '99' }),
      ],
      inflow: [],
    });
    expect(result.monthlyOutflowTotal).toBe(10);
    expect(result.excludedFromTotals).toBe(1);
  });

  it('sorts by monthly cost, with unknown cadences last', () => {
    const result = summarize({
      outflow: [
        stream({ streamId: 'cheap', frequency: 'MONTHLY', averageAmount: '5' }),
        stream({ streamId: 'unknown', frequency: 'UNKNOWN', averageAmount: '999' }),
        stream({ streamId: 'dear', frequency: 'MONTHLY', averageAmount: '50' }),
      ],
      inflow: [],
    });
    expect(result.outflow.map((i) => i.id)).toEqual(['dear', 'cheap', 'unknown']);
  });
});

describe('GET /api/subscriptions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('serves the stored Plaid streams, decrypted, both directions', async () => {
    const { upsertRecurringStreams } = await import('../src/store/plaid-recurring.js');
    await upsertRecurringStreams(
      testUserId,
      [
        {
          stream_id: 'in_1',
          account_id: 'a1',
          description: 'ACME PAYROLL',
          merchant_name: 'Acme',
          frequency: 'BIWEEKLY',
          average_amount: { amount: 2000 },
          last_amount: { amount: 2000 },
          last_date: '2026-08-01',
          status: 'MATURE',
        },
      ] as never,
      [
        {
          stream_id: 'out_1',
          account_id: 'a1',
          description: 'SPOTIFY USA',
          merchant_name: 'Spotify',
          frequency: 'MONTHLY',
          average_amount: { amount: 10.99 },
          last_amount: { amount: 10.99 },
          last_date: '2026-08-01',
          status: 'MATURE',
        },
      ] as never,
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/subscriptions', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      outflow: { name: string; monthlyAmount: number }[];
      inflow: { name: string }[];
      monthlyOutflowTotal: number;
      monthlyInflowTotal: number;
    }>();

    expect(body.outflow).toHaveLength(1);
    expect(body.outflow[0]?.name).toBe('Spotify');
    expect(body.monthlyOutflowTotal).toBeCloseTo(10.99, 2);
    expect(body.inflow[0]?.name).toBe('Acme');
    // Biweekly income restated monthly: 2000 * 26/12.
    expect(body.monthlyInflowTotal).toBeCloseTo(4333.33, 1);

    await app.close();
  });
});
