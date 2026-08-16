// 5s is the production per-attempt budget (engineering-budgets R-16.5).
//
// Overridable ONLY so tests can raise it. Under a loaded CI runner the event
// loop can stall past 5s while a mocked response sits queued, so the abort
// fires, every retry aborts too, and a test that never touched the network
// fails as though the provider were down. That is the runner's speed being
// asserted, not the code's behaviour. Production never sets this.
const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 5_000;
const RETRY_DELAYS_MS = [200, 400];

// 429 is deliberately NOT in here. A 5xx means the vendor failed and trying
// again is the right instinct; a 429 means the vendor asked us to stop, and
// retrying it on the same 200 ms / 400 ms ladder turns one logical call into
// three requests inside 600 ms against a limit we have just been told we are
// over. See the 429 branch below.
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

// A 429 buys at most one more attempt, not two.
//
// Plaid publishes its per-endpoint ceilings (https://plaid.com/data/rate-limits.json)
// and the binding one for the refresh fan-out is `/accounts/balance/get` at
// 5 requests per minute per Item. Three attempts per logical call meant a
// single rate-limited refresh could spend 3 of those 5 in under a second, so
// the retry made the condition it was retrying more likely rather than less.
const MAX_RATE_LIMIT_RETRIES = 1;

// How long a vendor may ask us to wait before we stop waiting and hand the 429
// to the caller. Above this, holding the request open costs more than the retry
// is worth: the iOS client gives up at 30 s and the caller has its own recovery.
const MAX_RETRY_AFTER_MS = 2_000;

function isTransient(err: unknown): boolean {
  if (err instanceof TypeError) return true; // network failure
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** How long to wait before retrying a 429, or null to stop retrying.
 *
 *  Honours `Retry-After` in both documented forms (delta-seconds and an HTTP
 *  date). A vendor that names a wait longer than we are willing to hold the
 *  request gets no retry at all, which is the honest reading of the header:
 *  it is an instruction, not a suggestion to try again sooner. */
function rateLimitDelayMs(res: Response, attempt: number): number | null {
  const header = res.headers.get('Retry-After');
  const fallback = RETRY_DELAYS_MS[attempt] ?? null;
  if (!header) return fallback;

  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
  if (!Number.isFinite(ms) || ms < 0) return fallback;

  return ms <= MAX_RETRY_AFTER_MS ? ms : null;
}

// Wraps fetch with a 5 s per-attempt timeout and up to 2 retries (exponential backoff:
// 200 ms → 400 ms). Retries on 5xx responses and transient network/timeout errors.
// A 429 gets at most one retry and honours Retry-After. Non-retryable responses
// (4xx other than 429, and any body the caller has to interpret) are returned
// as-is on the first attempt.
export async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  const maxAttempts = RETRY_DELAYS_MS.length + 1;
  const lastAttempt = maxAttempts - 1;
  let lastError: unknown;
  let rateLimitRetries = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt >= lastAttempt) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]!);
      continue;
    }

    if (res.status === 429) {
      const delay = rateLimitDelayMs(res, attempt);
      if (delay === null || rateLimitRetries >= MAX_RATE_LIMIT_RETRIES || attempt >= lastAttempt) return res;
      rateLimitRetries++;
      await sleep(delay);
      continue;
    }

    if (RETRYABLE_STATUSES.has(res.status) && attempt < lastAttempt) {
      lastError = new Error(`HTTP ${res.status}`);
      await sleep(RETRY_DELAYS_MS[attempt]!);
      continue;
    }

    return res;
  }

  throw lastError;
}
