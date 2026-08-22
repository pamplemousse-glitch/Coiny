import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeResponse(status: number, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers(headers),
    json: async () => ({}),
  } as unknown as Response;
}

describe('fetchWithRetry', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
    // Every test here calls the same host, so they share one retry budget
    // bucket, and the failures they deliberately provoke add up: without this
    // reset the suite drifts to within one failure of throttling itself and
    // becomes order-dependent. Found by counting, not by a flake, which is the
    // better order to find it in.
    const { resetRetryBudgets } = await import('../src/resilience/retry-budget.js');
    resetRetryBudgets();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // AWS full jitter: random_between(0, min(cap, base * 2^attempt)). The old
  // ladder was the fixed pair [200, 400], which is the textbook thundering-herd
  // setup once more than one caller shares a vendor, and the scheduler makes
  // them share constantly.
  describe('backoff', () => {
    it('spreads across the whole window rather than landing on fixed offsets', async () => {
      const { backoffMs } = await import('../src/util/fetch.js');
      const samples = Array.from({ length: 500 }, () => backoffMs(0));
      const distinct = new Set(samples);

      // The failure this pins: a fixed ladder produces ONE value here.
      expect(distinct.size).toBeGreaterThan(50);
      expect(Math.min(...samples)).toBeLessThan(100);
      expect(Math.max(...samples)).toBeGreaterThan(100);
    });

    it('never exceeds the exponential ceiling for its attempt', async () => {
      const { backoffMs } = await import('../src/util/fetch.js');
      // random() returning just under 1 is the worst case.
      const nearlyOne = () => 0.999999;
      expect(backoffMs(0, nearlyOne)).toBeLessThanOrEqual(200);
      expect(backoffMs(1, nearlyOne)).toBeLessThanOrEqual(400);
      expect(backoffMs(2, nearlyOne)).toBeLessThanOrEqual(800);
    });

    it('caps, so a high attempt number cannot produce an absurd delay', async () => {
      const { backoffMs } = await import('../src/util/fetch.js');
      expect(backoffMs(20, () => 0.999999)).toBeLessThanOrEqual(2_000);
    });

    it('can return zero, which is why 429 uses a different formula', async () => {
      const { backoffMs } = await import('../src/util/fetch.js');
      expect(backoffMs(3, () => 0)).toBe(0);
    });
  });

  it('returns response immediately on success', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 and returns success on second attempt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(500)).mockResolvedValueOnce(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 (rate limit) and returns success on second attempt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(429)).mockResolvedValueOnce(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  // The amplification that matters. Plaid's tightest per-Item ceiling is
  // /accounts/balance/get at 5 a minute
  // (https://plaid.com/data/rate-limits.json), so a wrapper that spent three
  // attempts on a rate-limited call burned three fifths of the minute's budget
  // in 600 ms and made the next call likelier to 429 too.
  it('spends at most two attempts on a persistent 429', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(429));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({ status: 429 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('honours a Retry-After it can afford to wait for', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(429, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');

    // The 200 ms ladder would have retried by now; the vendor asked for 1 s.
    await vi.advanceTimersByTimeAsync(500);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({ status: 200 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  // Retry-After is an instruction, not a hint to try again sooner. A vendor
  // asking for a minute gets no second request at all.
  it('does not retry when Retry-After is longer than it will wait', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(429, { 'Retry-After': '60' }));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({ status: 429 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('falls back to the backoff ladder when Retry-After is unparseable', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(429, { 'Retry-After': 'soon' }))
      .mockResolvedValueOnce(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({ status: 200 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('retries on network error (TypeError) and returns success on second attempt', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('retries on TimeoutError and returns success on second attempt', async () => {
    const timeoutErr = new DOMException('signal timed out', 'TimeoutError');
    vi.mocked(fetch).mockRejectedValueOnce(timeoutErr).mockResolvedValueOnce(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('exhausts all retries and throws after 3 failed attempts', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(503));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({ status: 503 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it('throws immediately after 3 network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    // Attach rejection handler before advancing timers to avoid unhandled rejection
    const assertion = expect(fetchWithRetry('https://example.com')).rejects.toBeInstanceOf(TypeError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(404));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({ status: 404 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 400', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(400));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({ status: 400 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('passes init options (method, headers, body) through to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
    const promise = fetchWithRetry('https://example.com', init);
    await vi.runAllTimersAsync();
    await promise;

    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[1]).toMatchObject({ method: 'POST', body: '{}' });
  });

  it('each attempt gets its own AbortSignal (signal is set on every call)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(500)).mockResolvedValueOnce(makeResponse(200));

    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    await promise;

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0]![1]?.signal).toBeDefined();
    expect(calls[1]![1]?.signal).toBeDefined();
    expect(calls[0]![1]?.signal).not.toBe(calls[1]![1]?.signal);
  });

  // The behaviour the whole change exists for. Without a budget, a dead vendor
  // receives 3 requests per logical call forever, multiplied by every user in
  // the scheduler's fan-out, and the existing per-(user, class) backoff only
  // engages five sweeps later.
  describe('the per-vendor retry budget', () => {
    it('stops retrying a persistently failing vendor, and still makes first attempts', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(500));
      const { fetchWithRetry } = await import('../src/util/fetch.js');

      // Drive the bucket down. Each call is 3 attempts, so 3 failures.
      for (let i = 0; i < 4; i++) {
        const p = fetchWithRetry('https://dead.example');
        await vi.runAllTimersAsync();
        await p;
      }

      vi.mocked(fetch).mockClear();
      const p = fetchWithRetry('https://dead.example');
      await vi.runAllTimersAsync();
      const res = await p;

      // Exactly one: the first attempt is never refused, because declining to
      // call at all would turn the vendor's bad minute into our outage. Only
      // the amplification is throttled.
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(500);
    });

    it('does not let one dead vendor throttle a healthy one', async () => {
      const { fetchWithRetry } = await import('../src/util/fetch.js');

      vi.mocked(fetch).mockResolvedValue(makeResponse(500));
      for (let i = 0; i < 4; i++) {
        const p = fetchWithRetry('https://dead.example');
        await vi.runAllTimersAsync();
        await p;
      }

      vi.mocked(fetch).mockReset();
      vi.mocked(fetch).mockResolvedValueOnce(makeResponse(500)).mockResolvedValueOnce(makeResponse(200));
      const p = fetchWithRetry('https://healthy.example');
      await vi.runAllTimersAsync();

      await expect(p).resolves.toMatchObject({ status: 200 });
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it('does not spend the budget on a 429, which is the vendor working correctly', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(429));
      const { fetchWithRetry } = await import('../src/util/fetch.js');
      const { retryBudgetStats } = await import('../src/resilience/retry-budget.js');

      for (let i = 0; i < 5; i++) {
        const p = fetchWithRetry('https://limited.example');
        await vi.runAllTimersAsync();
        await p;
      }

      const stats = retryBudgetStats().find((s) => s.vendor === 'limited.example');
      expect(stats?.throttled).toBe(false);
      expect(stats?.upstreamFailures).toBe(0);
    });

    it('does not spend the budget on a 404, which is a correct answer to a wrong question', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(404));
      const { fetchWithRetry } = await import('../src/util/fetch.js');
      const { retryBudgetStats } = await import('../src/resilience/retry-budget.js');

      for (let i = 0; i < 20; i++) {
        const p = fetchWithRetry('https://notfound.example');
        await vi.runAllTimersAsync();
        await p;
      }

      expect(retryBudgetStats().find((s) => s.vendor === 'notfound.example')?.throttled).toBe(false);
    });

    it('records a thrown network error as local origin, not upstream', async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
      const { fetchWithRetry } = await import('../src/util/fetch.js');
      const { retryBudgetStats } = await import('../src/resilience/retry-budget.js');

      const p = fetchWithRetry('https://unreachable.example');
      await vi.runAllTimersAsync();
      await expect(p).rejects.toThrow();

      const stats = retryBudgetStats().find((s) => s.vendor === 'unreachable.example');
      expect(stats?.localFailures).toBeGreaterThan(0);
      expect(stats?.upstreamFailures).toBe(0);
    });
  });
});
