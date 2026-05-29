import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFarmlandPricePerAcre } from '../src/usda/client.js';

function makeFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

describe('getFarmlandPricePerAcre', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when apiKey is empty', async () => {
    expect(await getFarmlandPricePerAcre('IA', '')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null for unknown state code', async () => {
    expect(await getFarmlandPricePerAcre('XX', 'key')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', makeFetch({}, 500));
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBeNull();
  });

  it('returns null when response does not match schema', async () => {
    vi.stubGlobal('fetch', makeFetch({ unexpected: true }));
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBeNull();
  });

  it('returns null when data array is empty', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [] }));
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBeNull();
  });

  it('returns the price per acre', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ Value: '8500', year: '2023' }] }));
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBe(8500);
  });

  it('parses values with commas', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ Value: '8,500', year: '2023' }] }));
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBe(8500);
  });

  it('accepts lowercase state codes', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ Value: '8500', year: '2023' }] }));
    expect(await getFarmlandPricePerAcre('ia', 'key')).toBe(8500);
  });

  it('filters out (D) suppressed values and uses valid ones', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        data: [
          { Value: '(D)', year: '2023' },
          { Value: '7500', year: '2022' },
        ],
      }),
    );
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBe(7500);
  });

  it('returns null when all values are suppressed', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        data: [
          { Value: '(D)', year: '2023' },
          { Value: '(NA)', year: '2022' },
        ],
      }),
    );
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBeNull();
  });

  it('picks the most recent year when multiple rows present', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        data: [
          { Value: '7500', year: '2021' },
          { Value: '9000', year: '2023' },
          { Value: '8000', year: '2022' },
        ],
      }),
    );
    expect(await getFarmlandPricePerAcre('IA', 'key')).toBe(9000);
  });
});
