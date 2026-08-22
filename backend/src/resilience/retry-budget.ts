// Per-vendor retry throttling, so retries cannot amplify an outage.
//
// The problem, measured on this codebase rather than imagined: `util/fetch.ts`
// gives every logical call up to three attempts, and the scheduler fans out
// over (user x class). Against a dead vendor that is `3 x users x classes`
// requests per sweep, and the existing per-(user, class) backoff in
// scheduler/index.ts only engages after FIVE consecutive failures, which is
// five whole sweeps later. Google's SRE book puts the general shape plainly: a
// 50% failure rate with unbudgeted retries produces 3.5x normal traffic, which
// prevents the recovery it is trying to wait for.
//
// ---------------------------------------------------------------------------
// This is gRPC's design, not one of ours
// ---------------------------------------------------------------------------
//
// Taken from gRFC A6 "client retries", which specifies retry throttling as a
// per-server token bucket:
//
//   - `token_count` starts at `maxTokens` and is clamped to [0, maxTokens].
//   - A retryable failure decrements it by 1.
//   - A success increments it by `tokenRatio`.
//   - Retries are disallowed while `token_count <= maxTokens / 2`.
//
// Two properties are worth understanding before changing the numbers.
//
// The asymmetry is deliberate. A failure costs 1 and a success returns 0.1, so
// a vendor has to serve ten good responses to buy back one bad one. That is the
// 10% retry budget the SRE book recommends, expressed as a bucket rather than a
// ratio over a window.
//
// A RATIO WOULD NOT WORK HERE, for the same reason the circuit breaker in
// scheduler/index.ts cannot compute one: our request volume per vendor is a
// handful per interval, and a rate over a handful of samples is noise. A bucket
// has no such problem because it carries state instead of sampling. This is the
// same lesson `docs/connection-resilience-survey.md` section 3 draws about the
// breaker, arriving from the other direction.
//
// ---------------------------------------------------------------------------
// Keyed per vendor, which is the axis the existing breaker gets wrong
// ---------------------------------------------------------------------------
//
// gRFC A6 says "per server", and Envoy's outlier detection ejects per upstream
// host. Both key on the DEPENDENCY. The existing scheduler backoff keys on
// (user, class), which means a vendor outage is paid for once per user. Keying
// this on the request's hostname means one user's failures protect every other
// user from the same dead vendor, and a healthy vendor is never slowed by an
// unhealthy one.

import { config } from '../config.js';

/** Why a failure counted, kept separate because Envoy's
 *  `split_external_local_origin_errors` is right that they are different
 *  evidence: a local timeout may be our network or our own event loop, while a
 *  502 is the vendor stating its own condition. Both spend the budget, since
 *  either way retrying is what amplifies. Nothing reads the split yet; the
 *  vendor-level breaker is where it earns its place, and recording it now costs
 *  one field and means that work starts with history instead of none. */
export type FailureOrigin = 'local' | 'upstream';

export type VendorRetryStats = {
  vendor: string;
  tokens: number;
  /** True when the bucket is at or below the threshold and retries are off. */
  throttled: boolean;
  requests: number;
  successes: number;
  localFailures: number;
  upstreamFailures: number;
  retriesAllowed: number;
  retriesDenied: number;
};

type Bucket = {
  tokens: number;
  requests: number;
  successes: number;
  localFailures: number;
  upstreamFailures: number;
  retriesAllowed: number;
  retriesDenied: number;
};

const buckets = new Map<string, Bucket>();

/** The vendor key: the hostname of the request.
 *
 *  Derived from the URL rather than passed in by callers, so all 38 clients get
 *  this without one of them being forgotten. An unparseable URL gets its own
 *  shared bucket rather than throwing; a malformed URL is a bug, and it must
 *  not be one that takes down the fetch path. */
export function vendorKeyFor(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '<unparseable>';
  }
}

function bucketFor(vendor: string): Bucket {
  const existing = buckets.get(vendor);
  if (existing) return existing;
  const created: Bucket = {
    tokens: config.RETRY_BUDGET_MAX_TOKENS,
    requests: 0,
    successes: 0,
    localFailures: 0,
    upstreamFailures: 0,
    retriesAllowed: 0,
    retriesDenied: 0,
  };
  buckets.set(vendor, created);
  return created;
}

/** Test seam. The buckets are process state, and a test asserting throttling
 *  has to be able to start from a known one. Mirrors resetSentryRateLimit. */
export function resetRetryBudgets(): void {
  buckets.clear();
}

/** Everything currently known, for `/health/integrations` and for the
 *  vendor-level breaker that lands next. Sorted so output is stable. */
export function retryBudgetStats(): VendorRetryStats[] {
  return [...buckets.entries()]
    .map(([vendor, b]) => ({
      vendor,
      tokens: b.tokens,
      throttled: b.tokens <= throttleThreshold(),
      requests: b.requests,
      successes: b.successes,
      localFailures: b.localFailures,
      upstreamFailures: b.upstreamFailures,
      retriesAllowed: b.retriesAllowed,
      retriesDenied: b.retriesDenied,
    }))
    .sort((a, b) => a.vendor.localeCompare(b.vendor));
}

/** gRFC A6's threshold, verbatim: half of maxTokens. */
function throttleThreshold(): number {
  return config.RETRY_BUDGET_MAX_TOKENS / 2;
}

/** Count a logical call against the vendor. One call, however many attempts. */
export function recordRequest(vendor: string): void {
  bucketFor(vendor).requests += 1;
}

/** A response the caller is going to accept. Buys back `tokenRatio` of a token.
 *
 *  Deliberately counts any non-retryable outcome, not only 2xx: a 404 is the
 *  vendor answering correctly, and treating it as a failure would throttle a
 *  perfectly healthy dependency that we happen to be asking wrong questions. */
export function recordSuccess(vendor: string): void {
  const b = bucketFor(vendor);
  b.successes += 1;
  b.tokens = Math.min(config.RETRY_BUDGET_MAX_TOKENS, b.tokens + config.RETRY_BUDGET_TOKEN_RATIO);
}

/** A retryable failure: a 5xx, a network error or a timeout. Costs a token.
 *
 *  A 429 is NOT one of these. The vendor is answering, and it is telling us to
 *  slow down, which `util/fetch.ts` already honours through Retry-After.
 *  Spending the health budget on a rate limit would throttle retries to a
 *  vendor that is working exactly as documented. gRFC A6 draws the same line by
 *  counting only retryable status codes. */
export function recordFailure(vendor: string, origin: FailureOrigin): void {
  const b = bucketFor(vendor);
  if (origin === 'local') b.localFailures += 1;
  else b.upstreamFailures += 1;
  b.tokens = Math.max(0, b.tokens - 1);
}

/**
 * Whether this vendor can afford a retry right now.
 *
 * Records the answer either way, because "how often did we decline to retry" is
 * the number that says whether the budget is doing anything, and it is the one
 * nobody collects until they wish they had.
 */
export function canRetry(vendor: string): boolean {
  const b = bucketFor(vendor);
  const allowed = b.tokens > throttleThreshold();
  if (allowed) b.retriesAllowed += 1;
  else b.retriesDenied += 1;
  return allowed;
}
