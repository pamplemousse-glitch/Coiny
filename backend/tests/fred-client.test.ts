import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/util/fetch.js', () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from '../src/util/fetch.js';

const mockedFetch = vi.mocked(fetchWithRetry);

// Shaped from the real fredgraph.csv response for USSTHPI, which is quarterly
// and stamps each observation with the first day of its quarter.
const CSV = [
  'observation_date,USSTHPI',
  '2000-01-01,200.00',
  '2000-04-01,205.00',
  '2010-01-01,300.00',
  '2020-01-01,400.00',
  '2026-01-01,800.00',
].join('\n');

function csvResponse(body: string, ok = true, status = 200): Response {
  return { ok, status, text: async () => body } as unknown as Response;
}

async function freshModule() {
  vi.resetModules();
  return import('../src/fred/client.js');
}

describe('getHpiSeries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses the quarterly series oldest first', async () => {
    mockedFetch.mockResolvedValue(csvResponse(CSV));
    const { getHpiSeries } = await freshModule();

    const series = await getHpiSeries();
    expect(series).toHaveLength(5);
    expect(series[0]).toEqual({ date: '2000-01-01', value: 200 });
    expect(series[series.length - 1]).toEqual({ date: '2026-01-01', value: 800 });
  });

  // FRED writes a missing observation as `.`. Skipping is correct: a gap in
  // the series is not an index of zero, which would value a house at nothing.
  it('skips missing observations rather than reading them as zero', async () => {
    mockedFetch.mockResolvedValue(
      csvResponse(['observation_date,USSTHPI', '2000-01-01,.', '2000-04-01,205.00'].join('\n')),
    );
    const { getHpiSeries } = await freshModule();

    const series = await getHpiSeries();
    expect(series).toEqual([{ date: '2000-04-01', value: 205 }]);
  });

  it('throws when the endpoint returns an unrecognised header', async () => {
    mockedFetch.mockResolvedValue(csvResponse('something,else\n2000-01-01,200'));
    const { getHpiSeries } = await freshModule();

    await expect(getHpiSeries()).rejects.toThrow('unrecognised header');
  });

  it('throws when the fetch fails', async () => {
    mockedFetch.mockResolvedValue(csvResponse('', false, 503));
    const { getHpiSeries } = await freshModule();

    await expect(getHpiSeries()).rejects.toThrow('503');
  });

  // A national index is identical for every user, so it belongs in the shared
  // cache: a thousand users must not buy a thousand copies of it.
  it('serves repeat calls from the shared cache', async () => {
    mockedFetch.mockResolvedValue(csvResponse(CSV));
    const { getHpiSeries } = await freshModule();

    await getHpiSeries();
    await getHpiSeries();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

describe('indexAsOf', () => {
  it('takes the quarter already in effect, not the nearest one', async () => {
    const { indexAsOf } = await freshModule();
    const series = [
      { date: '2000-01-01', value: 200 },
      { date: '2000-04-01', value: 205 },
    ];

    // February sits inside the quarter beginning in January, even though the
    // April observation is closer on the calendar.
    expect(indexAsOf(series, '2000-02-15')).toEqual({ date: '2000-01-01', value: 200 });
  });

  it('returns null for a date before the series begins', async () => {
    const { indexAsOf } = await freshModule();
    expect(indexAsOf([{ date: '2000-01-01', value: 200 }], '1990-01-01')).toBeNull();
  });
});

describe('deriveValueFromPurchase', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('scales the purchase price by the index ratio', async () => {
    mockedFetch.mockResolvedValue(csvResponse(CSV));
    const { deriveValueFromPurchase } = await freshModule();

    // Bought for $250,000 in 2010 (index 300); latest index 800.
    // 250000 * (800 / 300) = 666,666.67
    const result = await deriveValueFromPurchase(250_000, '2010-06-01');
    expect(result?.valueUsd).toBeCloseTo(666_666.67, 2);
    expect(result?.purchaseIndex).toEqual({ date: '2010-01-01', value: 300 });
    expect(result?.latestIndex).toEqual({ date: '2026-01-01', value: 800 });
  });

  it('returns null when the purchase predates the series', async () => {
    mockedFetch.mockResolvedValue(csvResponse(CSV));
    const { deriveValueFromPurchase } = await freshModule();

    await expect(deriveValueFromPurchase(250_000, '1970-01-01')).resolves.toBeNull();
  });

  it('returns null for a non-positive purchase price rather than a nonsense figure', async () => {
    mockedFetch.mockResolvedValue(csvResponse(CSV));
    const { deriveValueFromPurchase } = await freshModule();

    await expect(deriveValueFromPurchase(0, '2010-06-01')).resolves.toBeNull();
    await expect(deriveValueFromPurchase(-5, '2010-06-01')).resolves.toBeNull();
  });
});
