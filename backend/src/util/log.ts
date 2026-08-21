// A module-level logger for code that has no request in hand.
//
// The gap this closes: sixteen `console.*` calls wrote straight to stdout, and
// Fly captures stdout. `console` does not go through pino, which means the
// `redact` list and the `err` serializer in plugins/logger.ts did not apply to
// any of them. Thirteen logged a raw error or interpolated a value directly
// into the message, so the two leak classes we already fixed on the request
// path were wide open on this one.
//
// The scheduler, the reaction dispatcher and the vendor clients all run
// outside a request, which is why they reached for `console` in the first
// place. They get this instead.
//
// Same options object as the Fastify logger, deliberately. One redaction
// policy, one err serializer, one place to change them. If you find yourself
// wanting a second configuration, the answer is almost always that the first
// one is wrong.

import { pino } from 'pino';
import { config } from '../config.js';
import { captureError, flushSentry } from '../observability/sentry.js';
import { loggerOptions } from '../plugins/logger.js';

/** Long enough for one HTTP round trip to Sentry, short enough that a crashing
 *  process still restarts promptly. Fly restarts it either way. */
const FATAL_FLUSH_MS = 2_000;

export const log = pino({
  level: config.LOG_LEVEL,
  ...loggerOptions,
});

/**
 * Catch what would otherwise reach stdout unredacted.
 *
 * Node prints an uncaught exception itself, with the full message and stack,
 * before the process dies. That output never passes through pino, so every
 * control in this codebase is bypassed at exactly the moment the most
 * diagnostic detail is being emitted. A crash inside a Plaid call would print
 * the vendor's prose; a crash mid-decrypt could print worse.
 *
 * `uncaughtException` exits deliberately rather than continuing. The process
 * state after one is undefined, and a financial server that keeps serving from
 * an undefined state is worse than one that restarts. Fly restarts it.
 *
 * `unhandledRejection` only logs. Node's default is to terminate, and doing
 * that here would let one unawaited vendor promise take down a machine that is
 * otherwise serving fine.
 */
export function installProcessLogging(): void {
  process.on('uncaughtException', (err) => {
    log.fatal({ err }, 'uncaught exception, exiting');
    captureError(err, { fatal: true });
    // Flush before exiting. An unflushed transport loses precisely the event
    // worth having: the SDK batches, and `process.exit` does not drain it. The
    // exit is not conditional on the flush succeeding, because a Sentry
    // timeout must not turn a crash into a hang. `flushSentry` resolves false
    // on timeout rather than rejecting, and is a no-op with no DSN, so the
    // 100 ms pino tick below is preserved unchanged in that case.
    void flushSentry(FATAL_FLUSH_MS).finally(() => {
      setTimeout(() => process.exit(1), 100).unref();
    });
  });

  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    log.error({ err }, 'unhandled rejection');
    // Reported, but the process keeps serving, for the reason above: one
    // unawaited vendor promise must not take down a machine that is otherwise
    // fine. No flush, because nothing is about to exit.
    captureError(err);
  });
}
