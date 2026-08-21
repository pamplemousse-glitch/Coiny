// The scrubber is the whole compliance argument for adopting Sentry
// (docs/launch-gap-analysis.md section 9), so it is tested against real event
// shapes rather than asserted about in a comment. `tests/logger.test.ts` exists
// for the same reason and made the same point: the redaction control was
// "VERIFIED by convention, FAILS as a control" until something proved it.
//
// Every test here calls the exported pure functions directly. `Sentry.init` is
// never invoked: with no DSN the SDK is not initialised, which is the state in
// CI, and nothing in this file may be able to send an event anywhere.

import { getDefaultIntegrations } from '@sentry/node';
import { beforeEach, describe, expect, test } from 'vitest';
import { config } from '../src/config.js';
import {
  allowEvent,
  captureError,
  deepScrub,
  disabledIntegrationNames,
  eventKey,
  flushSentry,
  isSentryEnabled,
  resetSentryRateLimit,
  safeExceptionValue,
  scrubEvent,
} from '../src/observability/sentry.js';

/** A Plaid-shaped error: the message carries the vendor's prose tail, which is
 *  the exact string plugins/logger.ts was written to keep out of logs and which
 *  Sentry would otherwise transmit as `exception.values[].value`. */
class FakePlaidError extends Error {
  body = { error_type: 'ITEM_ERROR', error_code: 'ITEM_LOGIN_REQUIRED' };
  constructor() {
    super('ITEM_ERROR/ITEM_LOGIN_REQUIRED: the login details for First National Bank are no longer valid');
    this.name = 'PlaidApiError';
  }
}

function errorEvent(overrides: Record<string, unknown> = {}) {
  return {
    exception: {
      values: [
        {
          type: 'PlaidApiError',
          value: 'ITEM_ERROR/ITEM_LOGIN_REQUIRED: the login details for First National Bank are no longer valid',
          stacktrace: {
            frames: [{ filename: 'src/plaid/client.ts', lineno: 12, vars: { accessToken: 'access-abc' } }],
          },
        },
      ],
    },
    ...overrides,
  } as unknown as Parameters<typeof scrubEvent>[0];
}

beforeEach(() => {
  resetSentryRateLimit();
});

describe('isSentryEnabled', () => {
  test('is off in tests, so nothing here can reach a third party', () => {
    expect(config.SENTRY_DSN).toBe('');
    expect(isSentryEnabled()).toBe(false);
  });
});

describe('safeExceptionValue', () => {
  test('rebuilds a vendor error from its codes, never its message', () => {
    const value = safeExceptionValue(new FakePlaidError());
    expect(value).toBe('ITEM_ERROR/ITEM_LOGIN_REQUIRED');
    expect(value).not.toContain('First National Bank');
  });

  test('falls back to a Node error code', () => {
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND api.example.com'), { code: 'ENOTFOUND' });
    expect(safeExceptionValue(err)).toBe('ENOTFOUND');
  });

  test('falls back to the error name when there is no code', () => {
    expect(safeExceptionValue(new TypeError('cannot read balance of undefined'))).toBe('TypeError');
  });

  test('a non-Error throw is redacted rather than stringified', () => {
    expect(safeExceptionValue({ secret: 'sk-live-1' })).toBe('[redacted]');
  });
});

describe('deepScrub', () => {
  test('censors a forbidden key at the top level', () => {
    expect(deepScrub({ access_token: 'access-abc', vendor: 'plaid' })).toEqual({
      access_token: '[redacted]',
      vendor: 'plaid',
    });
  });

  test('censors a forbidden key nested past the depth pino wildcards cover', () => {
    const scrubbed = deepScrub({ a: { b: { c: { d: { institutionName: 'First National' } } } } }) as Record<
      string,
      // biome-ignore lint/suspicious/noExplicitAny: walking an arbitrary scrubbed shape in an assertion
      any
    >;
    expect(scrubbed.a.b.c.d.institutionName).toBe('[redacted]');
  });

  test('censors inside arrays', () => {
    expect(deepScrub({ items: [{ apiKey: 'k' }, { apiKey: 'k2' }] })).toEqual({
      items: [{ apiKey: '[redacted]' }, { apiKey: '[redacted]' }],
    });
  });

  test('keeps the key rather than removing it, so a censor is distinguishable from absence', () => {
    expect(Object.hasOwn(deepScrub({ email: 'a@b.c' }) as object, 'email')).toBe(true);
  });

  test('censors user identifiers pino is allowed to write but Sentry is not', () => {
    expect(deepScrub({ user_id: 'u_1', item_id: 'i_1', route: '/api/net-worth' })).toEqual({
      user_id: '[redacted]',
      item_id: '[redacted]',
      route: '/api/net-worth',
    });
  });

  test('stops at the depth bound instead of recursing forever', () => {
    let deep: Record<string, unknown> = { email: 'a@b.c' };
    for (let i = 0; i < 20; i++) deep = { nested: deep };
    expect(() => deepScrub(deep)).not.toThrow();
  });
});

describe('scrubEvent', () => {
  test('replaces the exception value with programmatic parts only', () => {
    const scrubbed = scrubEvent(errorEvent(), { originalException: new FakePlaidError() });
    expect(scrubbed?.exception?.values?.[0]?.value).toBe('ITEM_ERROR/ITEM_LOGIN_REQUIRED');
  });

  test('the institution name does not survive anywhere in the event', () => {
    const scrubbed = scrubEvent(errorEvent({ extra: { institutionName: 'First National Bank' } }), {
      originalException: new FakePlaidError(),
    });
    expect(JSON.stringify(scrubbed)).not.toContain('First National Bank');
  });

  test('drops request data, breadcrumbs and user wholesale', () => {
    const scrubbed = scrubEvent(
      errorEvent({
        request: { url: '/api/truelayer/callback?code=live-oauth-code', headers: { authorization: 'Bearer t' } },
        breadcrumbs: [{ message: 'GET https://api.zerion.io/v1/wallets/0xabc/positions' }],
        user: { id: 'u_1', email: 'a@b.c' },
        server_name: 'coiny-api-1',
      }),
      { originalException: new FakePlaidError() },
    );

    expect(scrubbed?.request).toBeUndefined();
    expect(scrubbed?.breadcrumbs).toBeUndefined();
    expect(scrubbed?.user).toBeUndefined();
    expect(scrubbed?.server_name).toBeUndefined();
    // The reason those fields are dropped rather than scrubbed: the OAuth code
    // and the wallet address live inside STRINGS, which no key-based policy
    // can see into.
    const serialised = JSON.stringify(scrubbed);
    expect(serialised).not.toContain('live-oauth-code');
    expect(serialised).not.toContain('0xabc');
  });

  test('drops per-frame local variables', () => {
    const scrubbed = scrubEvent(errorEvent(), { originalException: new FakePlaidError() });
    expect(scrubbed?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.vars).toBeUndefined();
    expect(JSON.stringify(scrubbed)).not.toContain('access-abc');
  });

  test('drops the source lines ContextLines attaches around each frame', () => {
    const withSource = errorEvent();
    const frame = withSource.exception?.values?.[0]?.stacktrace?.frames?.[0];
    if (!frame) throw new Error('fixture lost its frame');
    frame.pre_context = ['const key = process.env.PLAID_SECRET;'];
    frame.context_line = '  const res = await fetch(url, { headers: { Authorization: key } });';
    frame.post_context = ['  return res.json();'];

    const scrubbed = scrubEvent(withSource, { originalException: new FakePlaidError() });
    const cleaned = scrubbed?.exception?.values?.[0]?.stacktrace?.frames?.[0];
    expect(cleaned?.pre_context).toBeUndefined();
    expect(cleaned?.context_line).toBeUndefined();
    expect(cleaned?.post_context).toBeUndefined();
    expect(JSON.stringify(scrubbed)).not.toContain('PLAID_SECRET');
  });

  test('drops the installed dependency inventory', () => {
    const scrubbed = scrubEvent(errorEvent({ modules: { '@sentry/node': '10.70.0', pino: '9.5.0' } }), {
      originalException: new FakePlaidError(),
    });
    expect(scrubbed?.modules).toBeUndefined();
  });

  test('keeps the stack frames, which are the useful part and are all ours', () => {
    const scrubbed = scrubEvent(errorEvent(), { originalException: new FakePlaidError() });
    expect(scrubbed?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe('src/plaid/client.ts');
  });

  test('strips a query string off the transaction name', () => {
    const scrubbed = scrubEvent(errorEvent({ transaction: '/api/ynab/callback?codeChallenge=abc' }), {
      originalException: new FakePlaidError(),
    });
    expect(scrubbed?.transaction).toBe('/api/ynab/callback');
  });

  test('scrubs extra rather than dropping it, because that is where triage context lives', () => {
    const scrubbed = scrubEvent(errorEvent({ extra: { vendor: 'plaid', route: '/api/net-worth', apiKey: 'k' } }), {
      originalException: new FakePlaidError(),
    });
    expect(scrubbed?.extra).toEqual({ vendor: 'plaid', route: '/api/net-worth', apiKey: '[redacted]' });
  });
});

describe('the rate cap', () => {
  test('allows a repeating failure through only SENTRY_MAX_EVENTS_PER_KEY times', () => {
    const key = 'PlaidApiError:ITEM_ERROR/ITEM_LOGIN_REQUIRED';
    for (let i = 0; i < config.SENTRY_MAX_EVENTS_PER_KEY; i++) {
      expect(allowEvent(key)).toBe(true);
    }
    expect(allowEvent(key)).toBe(false);
  });

  test('a different failure is still reported once one key is capped', () => {
    const key = 'A:one';
    for (let i = 0; i < config.SENTRY_MAX_EVENTS_PER_KEY; i++) allowEvent(key);
    expect(allowEvent(key)).toBe(false);
    expect(allowEvent('B:two')).toBe(true);
  });

  test('a broad outage cannot exceed the window total', () => {
    // Distinct keys, so only the total limit can stop them. This is the vendor
    // outage shape: many users, many classes, all failing at once.
    let allowed = 0;
    for (let i = 0; i < config.SENTRY_MAX_EVENTS_PER_WINDOW * 5; i++) {
      if (allowEvent(`key-${i}`)) allowed++;
    }
    expect(allowed).toBe(config.SENTRY_MAX_EVENTS_PER_WINDOW);
  });

  test('the window rolls, so a capped failure is reported again later', () => {
    const start = 1_000_000;
    resetSentryRateLimit(start);
    for (let i = 0; i < config.SENTRY_MAX_EVENTS_PER_WINDOW; i++) allowEvent(`k-${i}`, start);
    expect(allowEvent('k-new', start)).toBe(false);
    expect(allowEvent('k-new', start + config.SENTRY_RATE_WINDOW_MS)).toBe(true);
  });

  test('scrubEvent returns null once capped, so the event never leaves', () => {
    const err = new FakePlaidError();
    for (let i = 0; i < config.SENTRY_MAX_EVENTS_PER_KEY; i++) {
      expect(scrubEvent(errorEvent(), { originalException: err })).not.toBeNull();
    }
    expect(scrubEvent(errorEvent(), { originalException: err })).toBeNull();
  });
});

describe('the disabled-integration list', () => {
  // This suite exists because the first version of the list was wrong and
  // nothing said so. It named `LocalVariables` (the real name is
  // `LocalVariablesAsync`) and `Fastify` (not a default integration at all),
  // so two of five entries filtered nothing, and it disabled `Http` while
  // every vendor client here calls out through `fetch`, which is `NodeFetch`.
  //
  // Matching by string against another package's internals is a silent failure
  // mode: the filter still runs, still returns a list, and collects the data
  // anyway. That is the exact shape docs/connection-resilience-survey.md is
  // about, so it gets a test rather than a comment.
  const defaults = new Set(getDefaultIntegrations({}).map((i) => i.name));

  test.each(disabledIntegrationNames())('%s is a real integration name in this SDK version', (name) => {
    expect(defaults.has(name)).toBe(true);
  });

  test('every default that attaches request, source or dependency data is disabled', () => {
    // Named explicitly rather than derived, so adding an integration to the
    // SDK cannot quietly satisfy this test. A new default that carries data
    // has to be considered by a person and added here.
    for (const name of [
      'RequestData',
      'Http',
      'NodeFetch',
      'Console',
      'ContextLines',
      'LocalVariablesAsync',
      'Modules',
    ]) {
      expect(disabledIntegrationNames()).toContain(name);
    }
  });
});

describe('the disabled state', () => {
  // util/log.ts calls both of these from the uncaught-exception and
  // unhandled-rejection handlers, where a throw would replace a diagnosable
  // crash with an undiagnosable one. With no DSN they must be inert, which is
  // the state every test run and every CI run is in.
  test('captureError is a silent no-op with no DSN', () => {
    expect(() => captureError(new FakePlaidError(), { route: '/api/net-worth' })).not.toThrow();
  });

  test('captureError does not throw on a non-Error value', () => {
    expect(() => captureError('a string was thrown')).not.toThrow();
  });

  test('flushSentry resolves true rather than hanging, so a fatal path still exits', async () => {
    await expect(flushSentry(1)).resolves.toBe(true);
  });
});

describe('eventKey', () => {
  test('groups by the same programmatic identity a person reads in Sentry', () => {
    expect(eventKey(errorEvent(), new FakePlaidError())).toBe('PlaidApiError:ITEM_ERROR/ITEM_LOGIN_REQUIRED');
  });

  test('two failures of the same vendor code share a key, so the cap counts them together', () => {
    expect(eventKey(errorEvent(), new FakePlaidError())).toBe(eventKey(errorEvent(), new FakePlaidError()));
  });
});
