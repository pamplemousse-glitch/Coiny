import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => ({}),
  } as unknown as Response;
}

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
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
});
