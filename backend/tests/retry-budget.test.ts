// The retry budget is gRFC A6's token bucket, so the tests assert A6's stated
// behaviour rather than this implementation's incidental behaviour. Where a
// number comes from the spec it says so, because "why 10?" is the question
// somebody will have in a year.

import { beforeEach, describe, expect, test } from 'vitest';
import { config } from '../src/config.js';
import {
  canRetry,
  recordFailure,
  recordRequest,
  recordSuccess,
  resetRetryBudgets,
  retryBudgetStats,
  vendorKeyFor,
} from '../src/resilience/retry-budget.js';

const MAX = config.RETRY_BUDGET_MAX_TOKENS;
/** A6: "the threshold, defined to be (maxTokens / 2)". */
const THRESHOLD = MAX / 2;

beforeEach(() => {
  resetRetryBudgets();
});

describe('vendorKeyFor', () => {
  test('keys on the hostname, so every path at one vendor shares a budget', () => {
    expect(vendorKeyFor('https://api.zerion.io/v1/wallets/0xabc/positions')).toBe('api.zerion.io');
    expect(vendorKeyFor('https://api.zerion.io/v1/wallets/0xdef/nft')).toBe('api.zerion.io');
  });

  test('different vendors get different budgets, which is the whole point', () => {
    expect(vendorKeyFor('https://api.zerion.io/x')).not.toBe(vendorKeyFor('https://production.plaid.com/x'));
  });

  test('an unparseable URL gets a bucket rather than throwing', () => {
    // A malformed URL is a bug, but it must not be one that takes down the
    // fetch path for every vendor.
    expect(vendorKeyFor('not a url')).toBe('<unparseable>');
  });
});

describe('the token bucket', () => {
  test('starts full, so a healthy vendor is never throttled from cold', () => {
    expect(canRetry('v')).toBe(true);
    expect(retryBudgetStats()[0]?.tokens).toBe(MAX);
  });

  test('allows exactly THRESHOLD retryable failures before retries stop', () => {
    for (let i = 0; i < THRESHOLD; i++) {
      expect(canRetry('v'), `retry ${i} should still be allowed`).toBe(true);
      recordFailure('v', 'upstream');
    }
    // tokens == MAX - THRESHOLD == THRESHOLD, and A6 disallows at <= threshold.
    expect(canRetry('v')).toBe(false);
  });

  test('a vendor that starts working again at the threshold recovers immediately', () => {
    // Sitting exactly AT the threshold, one success crosses it, because the
    // gate is `tokens > threshold` and a success adds tokenRatio. That is the
    // right behaviour and worth pinning: a vendor whose blip is over should not
    // serve a penalty, and this is the cheap half of the asymmetry.
    for (let i = 0; i < THRESHOLD; i++) recordFailure('v', 'upstream');
    expect(canRetry('v')).toBe(false);
    recordSuccess('v');
    expect(canRetry('v')).toBe(true);
  });

  test('a vendor that drained the bucket pays the full 10:1 to come back', () => {
    // The expensive half, and the one that actually implements the 10% budget.
    // From empty it takes ten successes per failure absorbed: 100 successes to
    // climb the ten tokens back to the threshold, plus one to cross it.
    for (let i = 0; i < MAX * 2; i++) recordFailure('v', 'upstream');
    expect(retryBudgetStats()[0]?.tokens).toBe(0);

    for (let i = 0; i < 100; i++) recordSuccess('v');
    expect(canRetry('v')).toBe(false);

    recordSuccess('v');
    expect(canRetry('v')).toBe(true);
  });

  test('tokens never exceed the maximum, however many successes arrive', () => {
    for (let i = 0; i < 1_000; i++) recordSuccess('v');
    expect(retryBudgetStats()[0]?.tokens).toBe(MAX);
  });

  test('tokens never go below zero, however long a vendor stays down', () => {
    for (let i = 0; i < 1_000; i++) recordFailure('v', 'upstream');
    expect(retryBudgetStats()[0]?.tokens).toBe(0);
  });

  test('one dead vendor does not throttle a healthy one', () => {
    // The defect this whole file exists for: the scheduler's existing breaker
    // is keyed per (user, class), so a vendor outage is paid for once per user
    // and never once per vendor. This is the other axis.
    for (let i = 0; i < MAX; i++) recordFailure('dead.example', 'upstream');
    expect(canRetry('dead.example')).toBe(false);
    expect(canRetry('healthy.example')).toBe(true);
  });
});

describe('the local versus upstream split', () => {
  test('records the origin separately while spending the same budget', () => {
    recordFailure('v', 'local');
    recordFailure('v', 'upstream');
    recordFailure('v', 'upstream');

    const stats = retryBudgetStats()[0];
    expect(stats?.localFailures).toBe(1);
    expect(stats?.upstreamFailures).toBe(2);
    // Both spend, because either way it is the retry that amplifies.
    expect(stats?.tokens).toBe(MAX - 3);
  });
});

describe('the stats surface', () => {
  test('counts denied retries, which is the number that says the budget worked', () => {
    for (let i = 0; i < MAX; i++) recordFailure('v', 'upstream');
    canRetry('v');
    canRetry('v');
    expect(retryBudgetStats()[0]?.retriesDenied).toBe(2);
  });

  test('reports throttled so a health endpoint can render it without recomputing', () => {
    for (let i = 0; i < THRESHOLD; i++) recordFailure('v', 'upstream');
    expect(retryBudgetStats()[0]?.throttled).toBe(true);
  });

  test('counts logical calls, not attempts', () => {
    recordRequest('v');
    recordRequest('v');
    expect(retryBudgetStats()[0]?.requests).toBe(2);
  });

  test('is sorted, so the health endpoint output is stable', () => {
    recordRequest('zulu.example');
    recordRequest('alpha.example');
    expect(retryBudgetStats().map((s) => s.vendor)).toEqual(['alpha.example', 'zulu.example']);
  });
});
