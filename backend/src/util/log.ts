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
import { loggerOptions } from '../plugins/logger.js';

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
    // Give pino a tick to flush before the process goes.
    setTimeout(() => process.exit(1), 100).unref();
  });

  process.on('unhandledRejection', (reason) => {
    log.error({ err: reason instanceof Error ? reason : new Error(String(reason)) }, 'unhandled rejection');
  });
}
