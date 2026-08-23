// 5s is the production per-attempt budget (engineering-budgets R-16.5).
//
// Overridable ONLY so tests can raise it. Under a loaded CI runner the event
// loop can stall past 5s while a mocked response sits queued, so the abort
// fires, every retry aborts too, and a test that never touched the network
// fails as though the provider were down. That is the runner's speed being
// asserted, not the code's behaviour. Production never sets this.
import { config } from '../config.js';
import {
  allowRequest,
  CircuitOpenError,
  recordBreakerFailure,
  recordBreakerSuccess,
} from '../resilience/circuit-breaker.js';
import { canRetry, recordFailure, recordRequest, recordSuccess, vendorKeyFor } from '../resilience/retry-budget.js';

const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 5_000;

/** Three attempts: the original plus two retries. The DELAYS are computed with
 *  full jitter rather than listed, see `backoffMs`. */
const MAX_ATTEMPTS = 3;

// 429 is deliberately NOT in here. A 5xx means the vendor failed and trying
// again is the right instinct; a 429 means the vendor asked us to stop, and
// retrying it on a short ladder turns one logical call into three requests
// inside a second against a limit we have just been told we are over. See the
// 429 branch below.
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

/**
 * Full jitter, from AWS's "Exponential Backoff And Jitter":
 * `sleep = random_between(0, min(cap, base * 2 ** attempt))`.
 *
 * The fixed `[200, 400]` ladder this replaces had no jitter at all, which is
 * the textbook thundering-herd setup the moment more than one caller shares a
 * vendor. Ours share constantly: the scheduler fans out over (user x class) at
 * concurrency 5, so every one of those units hit the same vendor at the same
 * two offsets after a failure, and then did it again next sweep.
 *
 * Full jitter rather than gRPC's multiplicative `random(0.8, 1.2)` because the
 * herd here is inside ONE process and highly synchronised: a plus-or-minus 20%
 * band keeps every retry inside a 40% window, while full jitter spreads them
 * across the whole interval. The known objection to full jitter, that it can
 * collapse to a near-zero delay, matters for throttling responses, and those do
 * not come through here: a 429 is handled by `rateLimitDelayMs` below, which
 * honours the vendor's own Retry-After and never returns zero.
 *
 * `random` is injectable so the test can assert the distribution rather than
 * assert that a random number is a number.
 */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const exponential = config.RETRY_BASE_DELAY_MS * 2 ** attempt;
  return Math.floor(random() * Math.min(config.RETRY_MAX_DELAY_MS, exponential));
}

/** How long to wait before retrying a 429, or null to stop retrying.
 *
 *  Honours `Retry-After` in both documented forms (delta-seconds and an HTTP
 *  date). A vendor that names a wait longer than we are willing to hold the
 *  request gets no retry at all, which is the honest reading of the header:
 *  it is an instruction, not a suggestion to try again sooner.
 *
 *  The fallback is EQUAL jitter (half fixed, half random) rather than the full
 *  jitter used above, precisely because full jitter can return a delay near
 *  zero and the one thing a rate-limited vendor must not get is an immediate
 *  second request. */
function rateLimitDelayMs(res: Response, attempt: number): number | null {
  const header = res.headers.get('Retry-After');
  const base = Math.min(config.RETRY_MAX_DELAY_MS, config.RETRY_BASE_DELAY_MS * 2 ** attempt);
  const fallback = base / 2 + Math.floor(Math.random() * (base / 2));
  if (!header) return fallback;

  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
  if (!Number.isFinite(ms) || ms < 0) return fallback;

  return ms <= MAX_RETRY_AFTER_MS ? ms : null;
}

/**
 * Wraps fetch with a 5 s per-attempt timeout and up to 2 retries.
 *
 * Four controls, in the order they engage:
 *
 *   0. A per-vendor circuit breaker (`resilience/circuit-breaker.ts`), checked
 *      before the first attempt. An open breaker throws `CircuitOpenError`
 *      without calling the vendor at all.
 *   1. Full-jitter backoff, so concurrent callers do not retry in lockstep.
 *   2. A per-vendor retry budget (`resilience/retry-budget.ts`), so a dead
 *      vendor stops receiving retries after about ten retryable failures
 *      rather than after every caller has spent its own three attempts.
 *   3. Retry-After on a 429, honoured as an instruction.
 *
 * The budget is consulted per retry, not per call: it always permits a first
 * attempt, because refusing to try at all would turn a vendor's bad minute into
 * our outage. Only the AMPLIFICATION is throttled.
 *
 * The BREAKER is the deliberate exception to that sentence, and the difference
 * is the point of having both. The budget answers "should we try harder"; the
 * breaker answers "should we try at all". It only refuses after the vendor has
 * failed five times in a row, it lets exactly one probe through to test
 * recovery, and an ejection ceiling bounds how much of the fleet it can take
 * out, so the case where refusing is wrong stays small and self-correcting.
 *
 * Callers MUST distinguish `CircuitOpenError` from a vendor failure. Recording
 * it as one feeds the breaker fabricated evidence about a vendor it never
 * called, which keeps it open: a self-sustaining outage caused by the thing
 * meant to prevent one. `isCircuitOpenError` is the guard.
 */
export async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  const vendor = vendorKeyFor(url);

  // The breaker is consulted BEFORE recordRequest, and before the first
  // attempt. This is the one place it differs from the retry budget above: the
  // budget always permits a first attempt and throttles only amplification,
  // while an open breaker refuses the call outright. A refused call is not a
  // request to the vendor and must not appear in the budget's denominator.
  if (!allowRequest(vendor)) throw new CircuitOpenError(vendor);

  recordRequest(vendor);

  const lastAttempt = MAX_ATTEMPTS - 1;
  let lastError: unknown;
  let rateLimitRetries = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      lastError = err;
      if (!isTransient(err)) throw err;
      // Every THROW from fetch is local-origin by construction: a DNS failure,
      // a refused or reset connection, or our own AbortSignal timeout. An
      // upstream failure comes back as a status, not an exception, which is
      // why the 5xx branch below is the only place 'upstream' is recorded.
      // That is Envoy's `split_external_local_origin_errors` distinction, and
      // in a fetch-based client it falls out of the control flow for free.
      recordFailure(vendor, 'local');
      recordBreakerFailure(vendor, 'local');
      if (attempt >= lastAttempt || !canRetry(vendor)) throw err;
      await sleep(backoffMs(attempt));
      continue;
    }

    if (res.status === 429) {
      // Not counted against the budget. The vendor is answering, and it is
      // telling us its rate, which we honour below.
      const delay = rateLimitDelayMs(res, attempt);
      if (delay === null || rateLimitRetries >= MAX_RATE_LIMIT_RETRIES || attempt >= lastAttempt) {
        recordSuccess(vendor);
        recordBreakerSuccess(vendor);
        return res;
      }
      rateLimitRetries++;
      await sleep(delay);
      continue;
    }

    if (RETRYABLE_STATUSES.has(res.status)) {
      recordFailure(vendor, 'upstream');
      recordBreakerFailure(vendor, 'upstream');
      if (attempt < lastAttempt && canRetry(vendor)) {
        lastError = new Error(`HTTP ${res.status}`);
        await sleep(backoffMs(attempt));
        continue;
      }
      // Out of attempts or out of budget: hand the 5xx to the caller, which
      // already knows how to record a failure and keep the last good value.
      return res;
    }

    // Any other status is the vendor answering. A 404 is a correct answer to a
    // wrong question and must not throttle a healthy dependency.
    recordSuccess(vendor);
    recordBreakerSuccess(vendor);
    return res;
  }

  throw lastError;
}
