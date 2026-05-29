import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 422 ? 'Unprocessable Entity' : status === 200 ? 'OK' : 'Error',
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('Frankfurter FX client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Reset module registry so each test gets a fresh import
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getExchangeRate', () => {
    it('returns the correct rate for the target currency', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse({
          amount: 1.0,
          base: 'GBP',
          date: '2026-05-28',
          rates: { USD: 1.34, EUR: 1.15 },
        }),
      );

      const { getExchangeRate } = await import('../src/fx/client.js');
      const rate = await getExchangeRate('GBP', 'USD');
      expect(rate).toBe(1.34);
    });

    it('throws FrankfurterError on non-2xx response', async () => {
      vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ message: 'not found' }, 404));

      const { getExchangeRate, FrankfurterError } = await import('../src/fx/client.js');
      await expect(getExchangeRate('GBP', 'USD')).rejects.toBeInstanceOf(FrankfurterError);
    });

    it('FrankfurterError carries the HTTP status code', async () => {
      vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ message: 'bad request' }, 400));

      const { getExchangeRate, FrankfurterError } = await import('../src/fx/client.js');
      let caught: unknown;
      try {
        await getExchangeRate('INVALID', 'USD');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(FrankfurterError);
      expect((caught as InstanceType<typeof FrankfurterError>).status).toBe(400);
    });

    it('throws FrankfurterError when target currency is missing from response', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse({
          amount: 1.0,
          base: 'GBP',
          date: '2026-05-28',
          rates: { EUR: 1.15 }, // USD missing
        }),
      );

      const { getExchangeRate, FrankfurterError } = await import('../src/fx/client.js');
      await expect(getExchangeRate('GBP', 'USD')).rejects.toBeInstanceOf(FrankfurterError);
    });
  });

  describe('getExchangeRates', () => {
    it('returns a map of rates for all requested currencies', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse({
          amount: 1.0,
          base: 'GBP',
          date: '2026-05-28',
          rates: { USD: 1.34, EUR: 1.15, AUD: 1.96 },
        }),
      );

      const { getExchangeRates } = await import('../src/fx/client.js');
      const rates = await getExchangeRates('GBP', ['USD', 'EUR', 'AUD']);
      expect(rates).toEqual({ USD: 1.34, EUR: 1.15, AUD: 1.96 });
    });

    it('builds the correct URL with from and to params', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse({
          amount: 1.0,
          base: 'GBP',
          date: '2026-05-28',
          rates: { USD: 1.34, EUR: 1.15 },
        }),
      );

      const { getExchangeRates } = await import('../src/fx/client.js');
      await getExchangeRates('GBP', ['USD', 'EUR']);

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('from=GBP');
      expect(url).toContain('to=USD%2CEUR');
    });

    it('throws FrankfurterError on non-2xx response', async () => {
      vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

      const { getExchangeRates, FrankfurterError } = await import('../src/fx/client.js');
      await expect(getExchangeRates('GBP', ['USD'])).rejects.toBeInstanceOf(FrankfurterError);
    });
  });

  describe('convertToUsd', () => {
    it('multiplies amount by the GBP→USD rate', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse({
          amount: 1.0,
          base: 'GBP',
          date: '2026-05-28',
          rates: { USD: 1.34 },
        }),
      );

      const { convertToUsd } = await import('../src/fx/client.js');
      const result = await convertToUsd(100, 'GBP');
      expect(result).toBeCloseTo(134, 5);
    });

    it('returns the amount unchanged when fromCurrency is USD (no API call)', async () => {
      const { convertToUsd } = await import('../src/fx/client.js');
      const result = await convertToUsd(250, 'USD');
      expect(result).toBe(250);
      expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    });

    it('throws FrankfurterError on API error', async () => {
      vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 503));

      const { convertToUsd, FrankfurterError } = await import('../src/fx/client.js');
      await expect(convertToUsd(50, 'EUR')).rejects.toBeInstanceOf(FrankfurterError);
    });
  });
});
