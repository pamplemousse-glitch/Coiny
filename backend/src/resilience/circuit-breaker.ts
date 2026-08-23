// Vendor-level circuit breaking, the last open gap in
// docs/connection-resilience-survey.md.
//
// ---------------------------------------------------------------------------
// Why this exists when scheduler/index.ts already has a breaker
// ---------------------------------------------------------------------------
//
// It has one, and it is keyed on the wrong axis. Survey section 3, measured
// against Envoy's outlier detection and opossum:
//
//   `scheduler/index.ts` backs off per (user, class) after 5 consecutive
//   failures. Envoy ejects per upstream HOST, `consecutive_5xx` default 5.
//   Same number, inverted axis.
//
// Four consequences follow, and this module answers each:
//
//   1. Cost scaled with users, not with the outage. A dead vendor cost
//      `5 failures x every affected user` before anything slowed. Keying on the
//      vendor means one user's failures protect everybody else's refresh.
//   2. Per-user keying made rate detection impossible rather than merely
//      unimplemented: at roughly one sample per refresh interval a RATE cannot
//      be computed at all. That is why re-keying was a precondition for this
//      work rather than one improvement among several.
//   3. The old counter never decayed, so a connection at fifty consecutive
//      failures was indistinguishable from one at five, forever. The window
//      here is bounded in TIME, as both references bound theirs.
//   4. There was no half-open probe: after backoff the scheduler retried a full
//      unit of work at full concurrency. Both references send exactly one probe.
//
// The per-(user, class) backoff stays where it is. The two are not
// alternatives: one answers "is this vendor down", the other "is this user's
// connection broken". That is precisely why one cannot serve as both.
//
// ---------------------------------------------------------------------------
// Two detectors, because one of them cannot work at our volume
// ---------------------------------------------------------------------------
//
// Envoy runs consecutive-failure and success-rate detection side by side, and
// gates the rate path behind a request-volume minimum. We need both for the
// reason retry-budget.ts records: our per-vendor volume is a handful of
// requests per interval, and a rate over a handful of samples is noise.
//
//   - CONSECUTIVE: works at volume 1. This is what will actually fire today.
//   - RATE over a rolling window, gated by a volume floor: silent at our
//     current volume by construction, and correct later without a rewrite. It
//     catches the failure the streak counter misses, a vendor failing half its
//     requests forever while never failing two in a row.
//
// Recording the rate path now costs one ring buffer and means the breaker does
// not need reopening when volume arrives.
//
// ---------------------------------------------------------------------------
// The ejection ceiling is not optional
// ---------------------------------------------------------------------------
//
// Envoy's `max_ejection_percent` exists so that detection cannot take out the
// whole cluster. The failure it prevents is this module having a bug: without a
// ceiling, one mistake here stops every refresh for every vendor and the
// product simply stops updating. With it, the blast radius is bounded no matter
// what the detectors decide. A breaker that can brick the product is a worse
// risk than the amplification it prevents.

import { config } from '../config.js';
import type { FailureOrigin } from './retry-budget.js';

/**
 * Thrown instead of calling a vendor whose breaker is open.
 *
 * It needs its own type, and this is the single most important detail in the
 * module. Every existing caller treats a throw from `fetchWithRetry` as
 * evidence about vendor health and records a failure: `ops_events`,
 * `sync_failed`, per-connection health. If the refusal were a plain `Error`
 * those callers would record failures for a vendor we never contacted, which
 * feeds this breaker's own window with fabricated evidence and keeps it open.
 *
 * That is a self-sustaining outage, caused by the thing meant to prevent one.
 * Callers must treat this as "skipped", never as "the vendor failed".
 */
export class CircuitOpenError extends Error {
  readonly vendor: string;

  constructor(vendor: string) {
    super(`circuit open for ${vendor}`);
    this.name = 'CircuitOpenError';
    this.vendor = vendor;
  }
}

/** Type guard, so callers do not have to match on `name` or use instanceof
 *  across a module boundary. */
export function isCircuitOpenError(err: unknown): err is CircuitOpenError {
  return err instanceof CircuitOpenError;
}

export type BreakerState = 'closed' | 'open' | 'half_open';

export type VendorBreakerStats = {
  vendor: string;
  state: BreakerState;
  consecutiveFailures: number;
  windowRequests: number;
  windowFailures: number;
  /** Ejections so far, which is what drives the exponential open duration. */
  ejections: number;
  /** Epoch ms the current open period ends, or null when not open. */
  openUntil: number | null;
  /** Why it opened, for the ops event and for /health/integrations. */
  lastTrip: 'consecutive' | 'rate' | null;
  /** Envoy's split_external_local_origin_errors distinction, carried from the
   *  start so treating them differently later needs no migration. */
  localFailures: number;
  upstreamFailures: number;
};

type Bucket = { start: number; requests: number; failures: number };

type Breaker = {
  state: BreakerState;
  consecutiveFailures: number;
  ejections: number;
  openUntil: number | null;
  lastTrip: 'consecutive' | 'rate' | null;
  /** Ring of time buckets covering the rolling window. */
  buckets: Bucket[];
  /** True once a half-open probe has been handed out, so only one is in
   *  flight. Both references send exactly one. */
  probeInFlight: boolean;
  /** When that probe was issued.
   *
   *  Without this the breaker has a permanent-refusal bug: a probe whose caller
   *  crashes, is cancelled, or simply never reports leaves `probeInFlight` true
   *  forever, and every later request is refused with nothing able to clear it.
   *  That is the "breaker bricks the product" failure the ejection ceiling
   *  exists to bound, arriving through a different door. A probe that has not
   *  reported within the timeout is abandoned and a fresh one is allowed. */
  probeStartedAt: number | null;
  localFailures: number;
  upstreamFailures: number;
};

const breakers = new Map<string, Breaker>();

/** Injectable clock. The buckets and the open period are both time-based, so a
 *  test that cannot move time can only assert the trivial cases. */
let now: () => number = () => Date.now();

/** Test seam, mirroring resetRetryBudgets. */
export function resetCircuitBreakers(clock?: () => number): void {
  breakers.clear();
  now = clock ?? (() => Date.now());
}

function bucketCount(): number {
  return config.BREAKER_WINDOW_BUCKETS;
}

function bucketMs(): number {
  return Math.max(1, Math.floor(config.BREAKER_WINDOW_MS / bucketCount()));
}

function breakerFor(vendor: string): Breaker {
  const existing = breakers.get(vendor);
  if (existing) return existing;
  const created: Breaker = {
    state: 'closed',
    consecutiveFailures: 0,
    ejections: 0,
    openUntil: null,
    lastTrip: null,
    buckets: [],
    probeInFlight: false,
    probeStartedAt: null,
    localFailures: 0,
    upstreamFailures: 0,
  };
  breakers.set(vendor, created);
  return created;
}

/** Drop buckets that have aged out of the window. This is the decay the old
 *  per-(user, class) counter never had. */
function evictExpired(b: Breaker, at: number): void {
  const cutoff = at - config.BREAKER_WINDOW_MS;
  b.buckets = b.buckets.filter((bucket) => bucket.start > cutoff);
}

function currentBucket(b: Breaker, at: number): Bucket {
  const size = bucketMs();
  const start = Math.floor(at / size) * size;
  const last = b.buckets[b.buckets.length - 1];
  if (last && last.start === start) return last;
  const created: Bucket = { start, requests: 0, failures: 0 };
  b.buckets.push(created);
  if (b.buckets.length > bucketCount()) b.buckets.shift();
  return created;
}

function windowTotals(b: Breaker): { requests: number; failures: number } {
  let requests = 0;
  let failures = 0;
  for (const bucket of b.buckets) {
    requests += bucket.requests;
    failures += bucket.failures;
  }
  return { requests, failures };
}

/** How many vendors are currently ejected, for the ceiling. */
function openCount(at: number): number {
  let count = 0;
  for (const b of breakers.values()) {
    if (b.state === 'open' && b.openUntil !== null && b.openUntil > at) count += 1;
  }
  return count;
}

/**
 * Envoy's `max_ejection_percent`, applied to the vendors we have actually seen.
 *
 * Returns true when opening one more would exceed the ceiling. The comparison
 * uses the count AFTER this ejection, so a ceiling of 50% with two known
 * vendors permits exactly one.
 *
 * With a single known vendor the ceiling would block the first ejection
 * entirely and the breaker could never fire, so one ejection is always
 * permitted. That is deliberate: the ceiling exists to stop a cascade, and
 * there is no cascade to stop at one vendor.
 */
function ceilingWouldBlock(at: number): boolean {
  const known = breakers.size;
  if (known <= 1) return false;
  const wouldBe = openCount(at) + 1;
  return (wouldBe / known) * 100 > config.BREAKER_MAX_EJECTION_PERCENT;
}

/** Exponential, capped, in the shape Envoy uses: base x 2^(ejections - 1). */
function ejectionMs(ejections: number): number {
  const exponent = Math.max(0, ejections - 1);
  const raw = config.BREAKER_BASE_EJECTION_MS * 2 ** exponent;
  return Math.min(raw, config.BREAKER_MAX_EJECTION_MS);
}

function trip(b: Breaker, reason: 'consecutive' | 'rate', at: number): void {
  if (ceilingWouldBlock(at)) return;
  b.ejections += 1;
  b.state = 'open';
  b.openUntil = at + ejectionMs(b.ejections);
  b.lastTrip = reason;
  b.probeInFlight = false;
  b.probeStartedAt = null;
}

/**
 * Whether a call to this vendor may proceed.
 *
 * Unlike the retry budget, which only throttles AMPLIFICATION and always
 * permits a first attempt, an open breaker refuses the call outright. That is
 * the whole point of the pattern and it is also its danger, which is what the
 * ejection ceiling above bounds.
 *
 * The half-open probe is handed out exactly once per open period. Everything
 * else is refused until the probe reports back, so a recovering vendor gets one
 * request rather than the full fan-out that knocked it over.
 */
export function allowRequest(vendor: string): boolean {
  const at = now();
  const b = breakerFor(vendor);

  if (b.state === 'closed') return true;

  if (b.state === 'open') {
    if (b.openUntil !== null && at < b.openUntil) return false;
    // The open period has elapsed. Promote to half-open and let exactly one
    // request through as the probe.
    b.state = 'half_open';
    b.probeInFlight = true;
    b.probeStartedAt = at;
    return true;
  }

  // half_open: only the single outstanding probe proceeds.
  if (!b.probeInFlight) {
    b.probeInFlight = true;
    b.probeStartedAt = at;
    return true;
  }
  // The outstanding probe never reported. Abandon it rather than refusing this
  // vendor forever; see `probeStartedAt`.
  if (b.probeStartedAt !== null && at - b.probeStartedAt >= config.BREAKER_PROBE_TIMEOUT_MS) {
    b.probeStartedAt = at;
    return true;
  }
  return false;
}

/** A response the caller accepted. Closes a half-open breaker. */
export function recordBreakerSuccess(vendor: string): void {
  const at = now();
  const b = breakerFor(vendor);
  evictExpired(b, at);
  currentBucket(b, at).requests += 1;
  b.consecutiveFailures = 0;

  if (b.state === 'half_open') {
    // The probe came back healthy. Close, and forget the ejection history:
    // the next outage should start from the base duration rather than
    // inheriting a long backoff from an outage that has since ended.
    b.state = 'closed';
    b.openUntil = null;
    b.ejections = 0;
    b.lastTrip = null;
    b.probeInFlight = false;
    b.probeStartedAt = null;
  }
}

/**
 * A retryable failure. Same accounting rule as the retry budget, deliberately:
 * a 429 is not one of these, because the vendor is answering and telling us its
 * rate, and a 404 is a correct answer to a wrong question.
 *
 * `origin` is recorded but does not currently change the decision. Envoy's
 * `split_external_local_origin_errors` treats them differently and we may too;
 * carrying it from the start means that choice does not need a migration.
 */
export function recordBreakerFailure(vendor: string, origin: FailureOrigin): void {
  const at = now();
  const b = breakerFor(vendor);
  evictExpired(b, at);
  const bucket = currentBucket(b, at);
  bucket.requests += 1;
  bucket.failures += 1;
  b.consecutiveFailures += 1;
  if (origin === 'local') b.localFailures += 1;
  else b.upstreamFailures += 1;

  if (b.state === 'half_open') {
    // The probe failed. Re-eject, for longer.
    trip(b, b.lastTrip ?? 'consecutive', at);
    return;
  }
  if (b.state === 'open') return;

  if (b.consecutiveFailures >= config.BREAKER_CONSECUTIVE_THRESHOLD) {
    trip(b, 'consecutive', at);
    return;
  }

  // The rate path, gated by the volume floor. Silent at today's volume by
  // construction: with a handful of requests per interval the floor is never
  // reached, and a rate over a handful of samples would be noise.
  const { requests, failures } = windowTotals(b);
  if (requests >= config.BREAKER_VOLUME_FLOOR && failures / requests >= config.BREAKER_FAILURE_RATE) {
    trip(b, 'rate', at);
  }
}

/** Everything currently known, for /health/integrations and the ops event. */
export function circuitBreakerStats(): VendorBreakerStats[] {
  const at = now();
  return [...breakers.entries()]
    .map(([vendor, b]) => {
      evictExpired(b, at);
      const { requests, failures } = windowTotals(b);
      return {
        vendor,
        state: b.state,
        consecutiveFailures: b.consecutiveFailures,
        windowRequests: requests,
        windowFailures: failures,
        ejections: b.ejections,
        openUntil: b.openUntil,
        lastTrip: b.lastTrip,
        localFailures: b.localFailures,
        upstreamFailures: b.upstreamFailures,
      };
    })
    .sort((a, b) => a.vendor.localeCompare(b.vendor));
}

/** The vendors currently refusing traffic. */
export function openBreakers(): VendorBreakerStats[] {
  const at = now();
  return circuitBreakerStats().filter((s) => s.state === 'open' && s.openUntil !== null && s.openUntil > at);
}
