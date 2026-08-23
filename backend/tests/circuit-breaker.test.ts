// Tests for src/resilience/circuit-breaker.ts.
//
// Time is injected rather than faked globally: every property that matters here
// (the rolling window's decay, the exponential open period, the half-open
// promotion) is a function of the clock, and a test that cannot move time can
// only assert the trivial cases.

import { beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import {
  allowRequest,
  circuitBreakerStats,
  openBreakers,
  recordBreakerFailure,
  recordBreakerSuccess,
  resetCircuitBreakers,
} from '../src/resilience/circuit-breaker.js';

let clock = 0;
const advance = (ms: number) => {
  clock += ms;
};

beforeEach(() => {
  clock = 1_000_000;
  resetCircuitBreakers(() => clock);
});

/** Drive a vendor to the consecutive threshold. */
function failToTrip(vendor: string): void {
  for (let i = 0; i < config.BREAKER_CONSECUTIVE_THRESHOLD; i++) {
    recordBreakerFailure(vendor, 'upstream');
  }
}

describe('closed by default', () => {
  it('allows a vendor it has never seen', () => {
    expect(allowRequest('api.example.com')).toBe(true);
  });

  it('stays closed below the consecutive threshold', () => {
    for (let i = 0; i < config.BREAKER_CONSECUTIVE_THRESHOLD - 1; i++) {
      recordBreakerFailure('a.example.com', 'upstream');
    }
    expect(allowRequest('a.example.com')).toBe(true);
  });
});

describe('consecutive-failure detection', () => {
  // The detector that actually fires at Coiny's volume. The rate path below is
  // silent by construction until request volume grows.
  it('opens at the threshold and refuses traffic', () => {
    // Two vendors so the ejection ceiling does not apply; see its own test.
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    expect(allowRequest('a.example.com')).toBe(false);
  });

  it('a success resets the streak, so five failures spread across a recovery do not trip it', () => {
    allowRequest('healthy.example.com');
    for (let i = 0; i < config.BREAKER_CONSECUTIVE_THRESHOLD - 1; i++) {
      recordBreakerFailure('a.example.com', 'upstream');
    }
    recordBreakerSuccess('a.example.com');
    recordBreakerFailure('a.example.com', 'upstream');
    expect(allowRequest('a.example.com')).toBe(true);
  });

  it('records why it tripped', () => {
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    const stats = circuitBreakerStats().find((s) => s.vendor === 'a.example.com');
    expect(stats?.lastTrip).toBe('consecutive');
    expect(stats?.state).toBe('open');
  });
});

describe('half-open probe', () => {
  it('promotes to half-open once the open period elapses', () => {
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    expect(allowRequest('a.example.com')).toBe(false);

    advance(config.BREAKER_BASE_EJECTION_MS + 1);
    expect(allowRequest('a.example.com')).toBe(true);
  });

  it('hands out exactly ONE probe, not a fan-out', () => {
    // The failure this prevents: after backoff the old scheduler retried a full
    // unit of work at full concurrency, against a vendor that had just been
    // knocked over.
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    advance(config.BREAKER_BASE_EJECTION_MS + 1);

    expect(allowRequest('a.example.com')).toBe(true);
    expect(allowRequest('a.example.com')).toBe(false);
    expect(allowRequest('a.example.com')).toBe(false);
  });

  it('closes on a successful probe', () => {
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    advance(config.BREAKER_BASE_EJECTION_MS + 1);
    allowRequest('a.example.com');
    recordBreakerSuccess('a.example.com');

    expect(circuitBreakerStats().find((s) => s.vendor === 'a.example.com')?.state).toBe('closed');
    expect(allowRequest('a.example.com')).toBe(true);
  });

  it('re-ejects on a failed probe rather than reopening the floodgates', () => {
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    advance(config.BREAKER_BASE_EJECTION_MS + 1);
    allowRequest('a.example.com');
    recordBreakerFailure('a.example.com', 'upstream');

    expect(allowRequest('a.example.com')).toBe(false);
  });
});

describe('exponential, capped ejection', () => {
  it('doubles the open period on each successive ejection', () => {
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');

    // First ejection: base. Just before it elapses, still refused.
    advance(config.BREAKER_BASE_EJECTION_MS - 1);
    expect(allowRequest('a.example.com')).toBe(false);

    // Elapse, probe, fail: second ejection should be 2x base.
    advance(2);
    allowRequest('a.example.com');
    recordBreakerFailure('a.example.com', 'upstream');

    advance(config.BREAKER_BASE_EJECTION_MS + 1);
    expect(allowRequest('a.example.com')).toBe(false);
    advance(config.BREAKER_BASE_EJECTION_MS);
    expect(allowRequest('a.example.com')).toBe(true);
  });

  it('never exceeds the cap, however long the outage runs', () => {
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    for (let i = 0; i < 20; i++) {
      advance(config.BREAKER_MAX_EJECTION_MS + 1);
      allowRequest('a.example.com');
      recordBreakerFailure('a.example.com', 'upstream');
    }
    advance(config.BREAKER_MAX_EJECTION_MS + 1);
    expect(allowRequest('a.example.com')).toBe(true);
  });

  it('forgets the ejection history after a clean recovery', () => {
    // Otherwise a vendor that had a bad day in the morning starts the evening
    // already at a ten-minute backoff.
    allowRequest('healthy.example.com');
    failToTrip('a.example.com');
    advance(config.BREAKER_BASE_EJECTION_MS + 1);
    allowRequest('a.example.com');
    recordBreakerSuccess('a.example.com');

    failToTrip('a.example.com');
    advance(config.BREAKER_BASE_EJECTION_MS + 1);
    expect(allowRequest('a.example.com')).toBe(true);
  });
});

describe('the rolling window decays, which the old counter never did', () => {
  it('drops failures that have aged out of the window', () => {
    recordBreakerFailure('a.example.com', 'upstream');
    recordBreakerFailure('a.example.com', 'upstream');
    expect(circuitBreakerStats().find((s) => s.vendor === 'a.example.com')?.windowFailures).toBe(2);

    advance(config.BREAKER_WINDOW_MS + 1);
    expect(circuitBreakerStats().find((s) => s.vendor === 'a.example.com')?.windowFailures).toBe(0);
  });
});

describe('rate detection is gated by the volume floor', () => {
  // This is the detector that CANNOT fire at today's volume, and that is the
  // point: a rate over a handful of samples is noise. It is here so the
  // breaker does not need reopening when volume arrives.
  it('does not open on a high failure rate below the floor', () => {
    allowRequest('healthy.example.com');
    // Alternate so the consecutive detector never fires, and stay under the
    // floor so the rate detector is not eligible either.
    for (let i = 0; i < 4; i++) {
      recordBreakerFailure('a.example.com', 'upstream');
      recordBreakerSuccess('a.example.com');
    }
    expect(allowRequest('a.example.com')).toBe(true);
  });

  it('opens on a sustained failure rate once the floor is reached', () => {
    allowRequest('healthy.example.com');
    // Never two failures in a row, so ONLY the rate path can explain a trip.
    while (
      (circuitBreakerStats().find((s) => s.vendor === 'a.example.com')?.windowRequests ?? 0) <
      config.BREAKER_VOLUME_FLOOR
    ) {
      recordBreakerFailure('a.example.com', 'upstream');
      recordBreakerSuccess('a.example.com');
    }
    // The rate is only evaluated inside a failure, and the loop above exits on
    // a success, so at this point the floor has been reached but nothing has
    // re-checked it. One more failure is what makes the assertion meaningful;
    // without it this passed for the wrong reason.
    expect(circuitBreakerStats().find((s) => s.vendor === 'a.example.com')?.state).toBe('closed');
    recordBreakerFailure('a.example.com', 'upstream');

    const stats = circuitBreakerStats().find((s) => s.vendor === 'a.example.com');
    expect(stats?.state).toBe('open');
    expect(stats?.lastTrip).toBe('rate');
    // And not because the streak counter got there first.
    expect(stats?.consecutiveFailures).toBeLessThan(config.BREAKER_CONSECUTIVE_THRESHOLD);
  });
});

describe('ejection ceiling', () => {
  // Envoy's max_ejection_percent. The failure it prevents is a bug in THIS
  // module stopping every refresh for every vendor.
  it('permits the first ejection when only one vendor is known', () => {
    // With one vendor a ceiling would block every ejection forever, and there
    // is no cascade to prevent at one vendor.
    failToTrip('only.example.com');
    expect(allowRequest('only.example.com')).toBe(false);
  });

  it('refuses to eject past the ceiling', () => {
    const vendors = ['a', 'b', 'c', 'd'].map((n) => `${n}.example.com`);
    for (const v of vendors) allowRequest(v);
    for (const v of vendors) failToTrip(v);

    const open = openBreakers().length;
    const ceiling = Math.floor((vendors.length * config.BREAKER_MAX_EJECTION_PERCENT) / 100);
    expect(open).toBeLessThanOrEqual(ceiling);
    expect(open).toBeGreaterThan(0);
  });

  it('a vendor blocked by the ceiling still serves traffic', () => {
    const vendors = ['a', 'b', 'c', 'd'].map((n) => `${n}.example.com`);
    for (const v of vendors) allowRequest(v);
    for (const v of vendors) failToTrip(v);

    const allowed = vendors.filter((v) => allowRequest(v));
    expect(allowed.length).toBeGreaterThan(0);
  });
});

describe('stats surface', () => {
  it('is sorted by vendor so output is stable', () => {
    for (const v of ['c.example.com', 'a.example.com', 'b.example.com']) {
      recordBreakerSuccess(v);
    }
    expect(circuitBreakerStats().map((s) => s.vendor)).toEqual(['a.example.com', 'b.example.com', 'c.example.com']);
  });

  it('reports nothing open when everything is healthy', () => {
    recordBreakerSuccess('a.example.com');
    expect(openBreakers()).toEqual([]);
  });
});

// The failure mode that would make this module worse than not having it.
describe('a refused call is not evidence about the vendor', () => {
  it('CircuitOpenError does not feed the breaker its own window', async () => {
    // Every existing caller treats a throw from fetchWithRetry as evidence that
    // the vendor failed. If the refusal were counted as a failure, an open
    // breaker would keep itself open on requests the vendor never received:
    // a self-sustaining outage caused by the thing meant to prevent one.
    const { fetchWithRetry } = await import('../src/util/fetch.js');
    const { isCircuitOpenError } = await import('../src/resilience/circuit-breaker.js');

    allowRequest('healthy.example.com');
    failToTrip('blocked.example.com');

    const before = circuitBreakerStats().find((s) => s.vendor === 'blocked.example.com');
    const beforeRequests = before?.windowRequests ?? 0;
    const beforeFailures = before?.windowFailures ?? 0;

    await expect(fetchWithRetry('https://blocked.example.com/v1/thing')).rejects.toSatisfy(isCircuitOpenError);

    const after = circuitBreakerStats().find((s) => s.vendor === 'blocked.example.com');
    expect(after?.windowRequests).toBe(beforeRequests);
    expect(after?.windowFailures).toBe(beforeFailures);
  });

  it('names the vendor, so a caller can tell which dependency was skipped', async () => {
    const { fetchWithRetry } = await import('../src/util/fetch.js');
    allowRequest('healthy.example.com');
    failToTrip('blocked.example.com');

    await expect(fetchWithRetry('https://blocked.example.com/v1/thing')).rejects.toMatchObject({
      name: 'CircuitOpenError',
      vendor: 'blocked.example.com',
    });
  });
});

describe('a refused call is labelled as such in the durable record', () => {
  it('classifyError distinguishes CircuitOpenError from a vendor failure', async () => {
    // Otherwise it lands as 'unknown' and writes a class_refresh_failed row for
    // a request that was never made. Those rows feed vendorFailureRollup and
    // therefore /health/integrations, so an ejected vendor would inflate its own
    // failure count and look worse the longer the breaker protected it.
    const { classifyError } = await import('../src/networth/refresh.js');
    const { CircuitOpenError } = await import('../src/resilience/circuit-breaker.js');

    expect(classifyError(new CircuitOpenError('api.example.com'))).toBe('circuit_open');
    // The existing classes are untouched.
    expect(classifyError(new TypeError('failed to fetch'))).toBe('network');
    expect(classifyError({ status: 503 })).toBe('5xx');
    expect(classifyError(new Error('something else'))).toBe('unknown');
  });
});
