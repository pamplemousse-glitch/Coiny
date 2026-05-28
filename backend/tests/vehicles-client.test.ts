import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: { MARKETCHECK_API_KEY: 'test-key' },
}));

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('getVehicleValue', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns marketcheck_price from response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ marketcheck_price: 25000 }));

    const { getVehicleValue } = await import('../src/vehicles/client.js');
    const price = await getVehicleValue('1HGBH41JXMN109186');
    expect(price).toBe(25000);
  });

  it('uses correct MarketCheck API endpoint and base URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ marketcheck_price: 18000 }));

    const { getVehicleValue } = await import('../src/vehicles/client.js');
    await getVehicleValue('1HGBH41JXMN109186');

    const calledUrl = (vi.mocked(fetch).mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('https://api.marketcheck.com/v2/predict/car/us/marketcheck_price');
    expect(calledUrl).toContain('vin=1HGBH41JXMN109186');
    expect(calledUrl).toContain('api_key=test-key');
    expect(calledUrl).toContain('miles=');
    expect(calledUrl).toContain('dealer_type=');
    expect(calledUrl).toContain('zip=');
  });

  it('passes custom miles, zip, and dealerType when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ marketcheck_price: 22000 }));

    const { getVehicleValue } = await import('../src/vehicles/client.js');
    await getVehicleValue('1HGBH41JXMN109186', { miles: 30000, zip: '10001', dealerType: 'independent' });

    const calledUrl = (vi.mocked(fetch).mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('miles=30000');
    expect(calledUrl).toContain('zip=10001');
    expect(calledUrl).toContain('dealer_type=independent');
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ message: 'Invalid authentication credentials' }, 401));

    const { getVehicleValue } = await import('../src/vehicles/client.js');
    await expect(getVehicleValue('1HGBH41JXMN109186')).rejects.toThrow('MarketCheck API error: 401');
  });
});
