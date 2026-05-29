import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPcgsCoinFacts } from '../src/pcgs/client.js';

function makeFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

describe('getPcgsCoinFacts', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when apiKey is empty', async () => {
    expect(await getPcgsCoinFacts(7112, 65, false, '')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', makeFetch({}, 401));
    expect(await getPcgsCoinFacts(7112, 65, false, 'key')).toBeNull();
  });

  it('returns null when IsValidRequest is false', async () => {
    vi.stubGlobal('fetch', makeFetch({ IsValidRequest: false, ServerMessage: 'invalid' }));
    expect(await getPcgsCoinFacts(7112, 65, false, 'key')).toBeNull();
  });

  it('returns name and null priceGuide when ServerMessage is No data found', async () => {
    vi.stubGlobal('fetch', makeFetch({ IsValidRequest: true, ServerMessage: 'No data found' }));
    const result = await getPcgsCoinFacts(7112, 65, false, 'key');
    expect(result).toEqual({ name: null, priceGuideUsd: null });
  });

  it('returns name and price when data is present', async () => {
    vi.stubGlobal('fetch', makeFetch({
      IsValidRequest: true,
      ServerMessage: 'OK',
      PCGSNo: 7112,
      Name: '1881-S Morgan Dollar',
      PriceGuideValue: 250.0,
      Grade: 65,
    }));
    const result = await getPcgsCoinFacts(7112, 65, false, 'key');
    expect(result).toEqual({ name: '1881-S Morgan Dollar', priceGuideUsd: 250.0 });
  });

  it('returns null priceGuide when PriceGuideValue is null', async () => {
    vi.stubGlobal('fetch', makeFetch({
      IsValidRequest: true,
      ServerMessage: 'OK',
      Name: 'Rare Coin',
      PriceGuideValue: null,
    }));
    const result = await getPcgsCoinFacts(99999, 70, false, 'key');
    expect(result?.priceGuideUsd).toBeNull();
  });
});
