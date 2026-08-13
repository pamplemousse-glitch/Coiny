// 5s is the production per-attempt budget (engineering-budgets R-16.5).
//
// Overridable ONLY so tests can raise it. Under a loaded CI runner the event
// loop can stall past 5s while a mocked response sits queued, so the abort
// fires, every retry aborts too, and a test that never touched the network
// fails as though the provider were down. That is the runner's speed being
// asserted, not the code's behaviour. Production never sets this.
const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 5_000;
const RETRY_DELAYS_MS = [200, 400];
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function isTransient(err: unknown): boolean {
  if (err instanceof TypeError) return true; // network failure
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  return false;
}

// Wraps fetch with a 5 s per-attempt timeout and up to 2 retries (exponential backoff:
// 200 ms → 400 ms). Retries on 429/5xx responses and transient network/timeout errors.
// Non-retryable errors (4xx except 429, parse failures) propagate immediately.
export async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  const maxAttempts = RETRY_DELAYS_MS.length + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise<void>((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]!));
    }
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (RETRYABLE_STATUSES.has(res.status) && attempt < maxAttempts - 1) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt >= maxAttempts - 1) throw err;
    }
  }

  throw lastError;
}
