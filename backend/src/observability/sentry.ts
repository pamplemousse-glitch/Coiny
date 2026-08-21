// Sentry error tracking, adopted 2026-08-21.
//
// `docs/launch-gap-analysis.md` section 9 recorded this as an unreconciled
// decision: `docs/environments-research.md` section 10 wanted Sentry, while
// `docs/legal/service-providers.md`, the privacy policy and the Safeguards
// 314.4(f) row in `docs/obligations.md` each enumerate a CLOSED set of
// processors that did not include it. Its condition was that Sentry is either
// declined or adopted completely, in one change: DPA, service-provider row,
// privacy-policy sentence, and scrubbing config alongside the SDK. That is what
// this file and its PR are.
//
// ---------------------------------------------------------------------------
// The thing to understand before editing
// ---------------------------------------------------------------------------
//
// This is the first component in the codebase that ships error payloads OFF
// the machine. Everything the `redact` list and the `err` serializer in
// plugins/logger.ts defend against applies here with a higher penalty, because
// a log line stays in Fly's retention and an event here reaches a third party.
//
// plugins/logger.ts names two leak mechanisms. Sentry adds a third:
//
//   1. A forbidden value under a KEY. Handled by `deepScrub` below, using the
//      SAME `FORBIDDEN_KEYS` list pino redacts on. Not a copy of it, an import.
//   2. A forbidden value inside a STRING, specifically `Error.message`. Sentry
//      sends `exception.values[].value`, which IS that message, so
//      `sendDefaultPii: false` does nothing about it. Handled by rebuilding the
//      value from programmatic parts, exactly as the pino `err` serializer
//      rebuilds its `message`.
//   3. Data the SDK attaches on its own, which pino never sees at all:
//      `requestDataIntegration` puts headers, query string and body on the
//      event; `httpIntegration` records every outbound vendor call as a
//      breadcrumb; `consoleIntegration` records console output. Handled by
//      disabling those three integrations AND by dropping the corresponding
//      event fields in `scrubEvent`, because two independent controls on the
//      highest-consequence path is the right number.
//
// `beforeSend` is the enforcement point rather than Sentry's server-side
// scrubbing, because server-side scrubbing runs AFTER the data has arrived. The
// requirement is that it never leaves the process.
//
// ---------------------------------------------------------------------------
// Why there is a rate cap
// ---------------------------------------------------------------------------
//
// The free plan allows 5,000 errors a month, roughly 166 a day. `util/fetch.ts`
// retries up to three times per logical call with no jitter and no budget, and
// the scheduler fans out per user, so a single vendor outage emits
// `3 x users x classes` near-identical events per sweep. Left uncapped it
// burns a month of quota in an afternoon, and the incident AFTER that one is
// invisible. Error tracking has to survive the failure it exists for, so the
// cap is part of the feature and not a nicety.

import * as Sentry from '@sentry/node';
import { config } from '../config.js';
import { FORBIDDEN_KEYS, pathOnly, REDACTED, scrubDeep, vendorErrorCode } from '../plugins/logger.js';

/** Keys pino is allowed to write that Sentry is not.
 *
 *  The one place this file's policy legitimately differs from
 *  plugins/logger.ts, and the difference is the recipient rather than the
 *  judgement. `.claude/rules/security.md` #2 permits logging `user_id`
 *  precisely because it is pseudonymous AND because the log stays in Fly. Sent
 *  to a third party it becomes a stable per-person identifier held outside our
 *  systems, and it buys nothing: Sentry answers "what broke and where", the
 *  correlated Fly log answers "for whom". Keeping every user identifier out is
 *  what lets the `service-providers.md` row read "no customer information",
 *  which is a much cheaper thing to be able to say than to qualify.
 *
 *  `item_id` is here for the same reason: it identifies one person's bank
 *  connection. */
const SENTRY_ONLY_FORBIDDEN = ['user_id', 'userId', 'item_id', 'itemId', 'device_token', 'deviceToken'];

/** Set membership, not the array scan `FORBIDDEN_KEYS` is written for. */
const FORBIDDEN: ReadonlySet<string> = new Set([...FORBIDDEN_KEYS, ...SENTRY_ONLY_FORBIDDEN]);

/** Integrations that attach data pino has never applied its policy to.
 *
 *  Removed by name rather than by `defaultIntegrations: false`, so the ones
 *  that make Sentry work at all (dedupe, context, the error handlers) stay on
 *  and a future SDK version's additions are not silently opted into.
 *
 *  MATCHING BY NAME IS A SILENT FAILURE MODE, and it already bit this file: the
 *  first version listed `LocalVariables` and `Fastify`, neither of which is a
 *  real integration name in v10, so those two filter entries did nothing at
 *  all. It also disabled `Http` while every vendor client in this codebase
 *  calls out through `fetch`, which is `NodeFetch`. A control that is present
 *  in source and absent in effect is exactly what
 *  `docs/connection-resilience-survey.md` is about, so
 *  `tests/sentry.test.ts` now asserts every name here exists among the SDK's
 *  own defaults. A rename in a future SDK breaks a test instead of quietly
 *  re-enabling collection. */
const DISABLED_INTEGRATIONS: ReadonlySet<string> = new Set([
  // Puts headers, query string and body on the event.
  'RequestData',
  // Breadcrumbs and spans for outbound calls. Both are needed: `Http` covers
  // node:http, `NodeFetch` covers global fetch, and OUR clients use fetch.
  'Http',
  'NodeFetch',
  // Console output as breadcrumbs. util/log.ts exists precisely because
  // console bypasses the redaction policy.
  'Console',
  // Reads the SOURCE FILE around each frame and attaches the lines. Our source
  // is not secret, but it is not ours to hand to a third party either, and it
  // is the one default that reads from disk at error time.
  'ContextLines',
  // Local variables at each frame, which is where a decrypted value or an
  // access token would sit at the moment of a throw.
  'LocalVariablesAsync',
  // The installed dependency list and versions. Not user data; still an
  // inventory of our supply chain that nothing needs.
  'Modules',
]);

/** Names every `DISABLED_INTEGRATIONS` entry must match. Exported so the test
 *  can compare this file's intent against the SDK's actual defaults. */
export function disabledIntegrationNames(): readonly string[] {
  return [...DISABLED_INTEGRATIONS];
}

let initialised = false;

type RateState = { windowStartedAt: number; total: number; perKey: Map<string, number> };

const rate: RateState = { windowStartedAt: 0, total: 0, perKey: new Map() };

/** Test seam. The cap is process state, so a test asserting the cap has to be
 *  able to clear it. Mirrors resetHealthSweepSchedule and resetPurgeSchedule. */
export function resetSentryRateLimit(now: number = Date.now()): void {
  rate.windowStartedAt = now;
  rate.total = 0;
  rate.perKey.clear();
}

/** Whether Sentry is configured at all. False in tests, CI and local runs. */
export function isSentryEnabled(): boolean {
  return config.SENTRY_DSN !== '';
}

/**
 * Rolling-window cap, evaluated per event.
 *
 * Two limits rather than one: `perKey` stops a single repeating failure
 * crowding out everything else, and `total` stops a broad outage draining the
 * plan. An event refused here is still logged by pino, so nothing is lost that
 * was not already recorded somewhere with longer retention.
 *
 * Exported for the test; `beforeSend` is the only production caller.
 */
export function allowEvent(key: string, now: number = Date.now()): boolean {
  if (now - rate.windowStartedAt >= config.SENTRY_RATE_WINDOW_MS) resetSentryRateLimit(now);
  if (rate.total >= config.SENTRY_MAX_EVENTS_PER_WINDOW) return false;
  const seen = rate.perKey.get(key) ?? 0;
  if (seen >= config.SENTRY_MAX_EVENTS_PER_KEY) return false;
  rate.perKey.set(key, seen + 1);
  rate.total += 1;
  return true;
}

/**
 * Replace the value of any forbidden key, at any depth.
 *
 * The walk itself lives in plugins/logger.ts and is shared with pino, so the
 * two paths cannot diverge in behaviour. What differs is only the key set, and
 * that difference is deliberate: see `SENTRY_ONLY_FORBIDDEN`.
 */
export function deepScrub(value: unknown): unknown {
  return scrubDeep(value, FORBIDDEN);
}

/**
 * Rebuild an exception's `value` from programmatic parts only.
 *
 * This is the pino `err` serializer's message rule, applied to the field Sentry
 * actually transmits. A `PlaidApiError` message is
 * `${error_type}/${error_code}: ${error_message}`, and the vendor's prose tail
 * has carried institution names. `err.message` is never read here. If you are
 * editing this and reach for it, that is the leak.
 */
export function safeExceptionValue(err: unknown): string {
  if (!(err instanceof Error)) return REDACTED;
  const vendor = vendorErrorCode(err);
  if (vendor.vendor_error_type && vendor.vendor_error_code) {
    return `${vendor.vendor_error_type}/${vendor.vendor_error_code}`;
  }
  const nodeCode = (err as unknown as { code?: unknown }).code;
  return typeof nodeCode === 'string' ? nodeCode : err.name;
}

/** The grouping key the cap counts on: the same programmatic identity the
 *  rebuilt exception value carries, so "the same failure" means the same thing
 *  to the cap as it does to a person reading Sentry. */
export function eventKey(event: Sentry.ErrorEvent, err: unknown): string {
  const type = event.exception?.values?.[0]?.type ?? (err instanceof Error ? err.name : 'unknown');
  return `${type}:${safeExceptionValue(err)}`;
}

/**
 * The hard gate. Everything leaving this process for Sentry passes here.
 *
 * Returns null to drop the event entirely, which is what the rate cap and an
 * unconfigured DSN both do.
 */
export function scrubEvent(event: Sentry.ErrorEvent, hint?: Sentry.EventHint): Sentry.ErrorEvent | null {
  const original = hint?.originalException;

  if (!allowEvent(eventKey(event, original))) return null;

  // Whole fields, dropped rather than scrubbed. Each is populated by an
  // integration disabled above; dropping them here is the second control, and
  // it is what keeps an SDK upgrade that re-enables one from becoming a leak.
  //
  // `delete` rather than assigning undefined: the project runs
  // exactOptionalPropertyTypes, under which `field?: T` does not accept
  // undefined, and "remove the key" is what is actually meant here anyway.
  delete event.request;
  delete event.breadcrumbs;
  delete event.user;
  delete event.server_name;
  // The installed dependency inventory. `Modules` is disabled; this is its
  // second control, for the same reason every other one has two.
  delete event.modules;

  // A transaction name is a route, and a route can arrive with a query string
  // attached. Same reasoning as the pino `req` serializer: the identity is the
  // path, and the parameters are where the OAuth codes live.
  if (event.transaction) event.transaction = pathOnly(event.transaction);

  for (const value of event.exception?.values ?? []) {
    value.value = safeExceptionValue(original);
    // Sentry parses stacks into structured frames, so the "Name: message"
    // header pino has to strip is already gone. What can still carry a value is
    // per-frame local variables, which the LocalVariables integration attaches.
    // It is disabled, and this drops the field regardless.
    for (const frame of value.stacktrace?.frames ?? []) {
      // Local variables: where a decrypted value or an access token sits at the
      // moment of a throw.
      delete frame.vars;
      // Source lines around the frame, attached by ContextLines, which reads
      // the file from disk at error time. The integration is disabled; this is
      // the second control, and it is the one that was missing when the
      // integration name in the disable list turned out to be wrong.
      delete frame.pre_context;
      delete frame.context_line;
      delete frame.post_context;
    }
  }

  // Free-form maps a caller can put anything into. Scrubbed, not dropped: this
  // is where the useful context lives (vendor, error class, item id).
  if (event.extra) event.extra = deepScrub(event.extra) as Record<string, unknown>;
  if (event.tags) event.tags = deepScrub(event.tags) as typeof event.tags;
  if (event.contexts) event.contexts = deepScrub(event.contexts) as typeof event.contexts;

  // A top-level message is written by us, never by a vendor, but it is a string
  // and strings are the mechanism `deepScrub` cannot see into. Dropped rather
  // than trusted.
  if (event.message) event.message = pathOnly(event.message);

  return event;
}

/**
 * Initialise the SDK. A no-op without a DSN, which is the state in tests, CI
 * and local development, and is the reason nothing here needs a test double.
 *
 * Called from `observability/instrument.ts`, which `server.ts` imports first.
 */
export function initSentry(): void {
  if (initialised || !isSentryEnabled()) return;
  initialised = true;
  resetSentryRateLimit();

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.APP_ENV,
    // Stated rather than relied upon. It defaults to false in the SDK today;
    // a default is not a control, and this one governs whether IP addresses,
    // cookies and request bodies are collected automatically.
    sendDefaultPii: false,
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    // No OpenTelemetry loader hooks. They exist to auto-instrument modules for
    // tracing, which is off, and they patch every package in the process to do
    // it. Turning them off is also what lets a plain top-level import replace
    // the `--import ./instrument.mjs` flag the ESM guide otherwise requires.
    registerEsmLoaderHooks: false,
    integrations: (defaults) => defaults.filter((i) => !DISABLED_INTEGRATIONS.has(i.name)),
    beforeSend: scrubEvent,
    // Breadcrumbs are the highest-risk, lowest-value surface here: outbound
    // vendor URLs, console output and query strings, none of which have been
    // through the policy. There is no breadcrumb we want badly enough to
    // maintain a scrubber for.
    beforeBreadcrumb: () => null,
  });
}

/**
 * Report an error, best-effort.
 *
 * Never throws, for the same reason `trackServerEvent` never throws: an
 * observability failure must not break the operation that triggered it.
 */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!isSentryEnabled()) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // Deliberately silent. The caller has already logged through pino, and a
    // logging call here could recurse into this same path.
  }
}

/**
 * Drain the queue before the process goes.
 *
 * `util/log.ts` exits on an uncaught exception, and an unflushed transport
 * loses precisely the event worth having. Resolves false on timeout rather
 * than throwing, so a caller can exit either way.
 */
export async function flushSentry(timeoutMs = 2_000): Promise<boolean> {
  if (!isSentryEnabled()) return true;
  try {
    return await Sentry.flush(timeoutMs);
  } catch {
    return false;
  }
}
