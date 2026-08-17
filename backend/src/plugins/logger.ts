// Log shape and redaction (PRD R-31.1 to R-31.5, runbook G1.21).
//
// The rule is `.claude/rules/security.md` #2: log identifiers and codes, never
// values. Until this file grew a `redact` list, that rule held only because
// every author had so far chosen well, which `01-security.md` 1.8.3 recorded
// bluntly as "VERIFIED by convention, FAILS as a control". A rule with no
// enforcement is a hope.
//
// Two different leaks, and they need two different mechanisms. That is the
// thing worth understanding before editing this file:
//
//   1. A forbidden value under a KEY, e.g. `req.log.info({ merchant_name })`.
//      `redact` handles this, and only this.
//   2. A forbidden value inside a STRING, e.g. `PlaidApiError.message`, which
//      is built as `${error_type}/${error_code}: ${error_message}` and whose
//      vendor prose has carried institution names. `redact` cannot see inside
//      a string, so no path list will ever catch it. The `err` serializer
//      below is what handles that, by refusing to log `message` at all.
//
// Adding paths here without keeping that second mechanism is the failure mode
// this comment exists to prevent: the redact list looks thorough, and the leak
// walks straight past it.

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ResSerializerReply } from 'fastify/types/logger.js';
import type { RawServerDefault } from 'fastify/types/utils.js';

/** Field names that must never reach a log line, whatever nests them.
 *
 *  Pino matches by PATH, not by name, so `merchant_name` alone censors only a
 *  top-level key. The wildcard forms below cover the realistic nestings, and
 *  `tests/logger.test.ts` is what proves the depth rather than assuming it.
 *
 *  Ordered by what they protect: credentials first, then the identifying half
 *  of the behavioural profile, then amounts. */
const FORBIDDEN_KEYS = [
  // Credentials. A leaked access token is a live bank connection.
  'access_token',
  'accessToken',
  'public_token',
  'publicToken',
  'link_token',
  'linkToken',
  'refresh_token',
  'refreshToken',
  'identity_token',
  'identityToken',
  'authorization',
  'password',
  'secret',
  'api_key',
  'apiKey',
  'private_key',
  'privateKey',
  // Identity. `sub` is the Apple/Google subject: pseudonymous to them, a
  // permanent cross-service identifier to us.
  'email',
  'sub',
  'appleSub',
  'googleSub',
  'display_name',
  'displayName',
  // The identifying half of the profile. Merchant plus date reads as "where
  // this person was and what they bought" (schema.ts, the encryption note on
  // `transactions`). Institution names are user financial data by the same
  // argument: they say which bank someone uses.
  'merchant_name',
  'merchantName',
  'institution_name',
  'institutionName',
  'creditorName',
  'creditor_name',
  'description',
  // Amounts. A magnitude without a merchant is weaker, but a balance still
  // says how much someone has.
  'amount',
  'balance',
  'available',
  'current',
  'credit_score',
  'creditScore',
  'mask',
  'last4',
];

/** Every place a forbidden key realistically appears.
 *
 *  `*.key` covers one level of nesting, which is where pino's own serializers
 *  put things (`req.headers.*`) and where most log payloads sit. The bare form
 *  covers the top level. Deeper nesting is covered by the wildcard at the end
 *  of each family rather than by guessing at paths. */
function redactPaths(): string[] {
  const paths: string[] = [];
  for (const key of FORBIDDEN_KEYS) {
    paths.push(key);
    paths.push(`*.${key}`);
    paths.push(`*.*.${key}`);
  }
  // Headers deserve explicit entries: the Authorization header carries a live
  // session token and pino's default req serializer would otherwise include it
  // if anyone ever removed the custom serializer below.
  paths.push('req.headers.authorization');
  paths.push('req.headers.cookie');
  paths.push('request.headers.authorization');
  paths.push('headers.authorization');
  return paths;
}

export const loggerOptions = {
  redact: {
    paths: redactPaths(),
    // "[redacted]" rather than removal, so a log line proves a field was
    // present and censored. A missing key is indistinguishable from a key that
    // was never set, which is the wrong answer during an incident.
    censor: '[redacted]',
    remove: false,
  },
  serializers: {
    // Typed as Fastify's own request rather than a narrow structural shape.
    // A hand-written `{ method, url, user? }` does not satisfy the overload:
    // Fastify passes the full FastifyRequest, and under
    // exactOptionalPropertyTypes the mismatch surfaces as an error pointing at
    // the whole logger config rather than at this parameter.
    req(req: FastifyRequest) {
      return {
        method: req.method,
        // Path only. Never the Authorization header: it may carry a live
        // session token.
        url: req.url,
        // R-31.2. Without this, "which account did this" cannot be answered
        // from logs at all (audit 1.0.3), which is the monitoring Safeguards
        // 314.4(c)(8) asks for. Pseudonymous by construction: it is our own
        // row id, not an email and not a provider `sub`.
        //
        // Null simply means the request never authenticated: a 401, /health,
        // or the webhook route. It is not an error condition.
        user_id: req.user?.id ?? null,
      };
    },
    // ResSerializerReply, not FastifyReply. Fastify's own definition is
    // `Partial<RawReply> & Pick<RawReply, 'statusCode'>`, with the comment
    // "only statusCode is passed in certain cases". So every field but the
    // status is optional here, a FastifyReply parameter is too narrow to accept
    // it, and the mismatch surfaces as an error against the entire logger
    // config rather than against this line. It is also why `url` below is
    // written as optional rather than assumed present.
    res(res: ResSerializerReply<RawServerDefault, FastifyReply>) {
      return {
        statusCode: res.statusCode,
        // R-31.2. Without it, a per-route p95 is a stream join across two
        // lines keyed by reqId rather than a group-by
        // (04-performance-reliability.md 4.5.2).
        url: res.request?.url ?? null,
      };
    },
    /**
     * The mechanism `redact` cannot provide (R-31.4, R-31.5).
     *
     * Pino's default `err` serializer writes `message` and `stack`. For a
     * `PlaidApiError` the message is `${error_type}/${error_code}:
     * ${error_message}`, and Plaid's `error_message` is vendor prose that has
     * carried institution names. Twenty-four sites across twelve files log a
     * caught error object, so leaving the default in place means any of them
     * can write vendor free text into the log stream.
     *
     * So: no `message`, ever. The type and the programmatic code are what a
     * human actually needs to act on, and the stack locates it in our code.
     * If you find yourself wanting the message back, the fix is to log the
     * specific field you need, not to widen this.
     */
    err(err: unknown): { type: string; message: string; stack: string; [key: string]: unknown } {
      if (!(err instanceof Error)) {
        return { type: typeof err, message: '[redacted]', stack: '' };
      }

      const nodeCode =
        typeof (err as unknown as { code?: unknown }).code === 'string'
          ? (err as unknown as { code: string }).code
          : null;
      const vendor = vendorErrorCode(err);

      // pino's serializer contract requires a `message`, so the field cannot
      // simply be dropped. It is REBUILT from programmatic parts instead, which
      // is R-31.5 exactly: `error_type/error_code` is what PlaidApiError should
      // have carried in the first place, without the vendor's prose tail.
      //
      // `err.message` is never read. If you are editing this and reach for it,
      // that is the leak.
      const message =
        vendor.vendor_error_type && vendor.vendor_error_code
          ? `${vendor.vendor_error_type}/${vendor.vendor_error_code}`
          : (nodeCode ?? err.name);

      return {
        type: err.name,
        message,
        // FRAMES ONLY. This is not a stylistic trim.
        //
        // Node builds `err.stack` as "Name: message\n    at ...", so logging
        // the stack verbatim puts the message back in the log line that the
        // `message` field above just took out. For a PlaidApiError that header
        // reads "PlaidApiError: ITEM_ERROR/ITEM_LOGIN_REQUIRED: the login
        // details for <institution> are no longer valid", which is precisely
        // the leak. The frames are the useful part and they are all ours.
        //
        // Found by tests/logger.test.ts failing, not by review.
        stack: stackFramesOnly(err.stack),
        // Present on Fastify errors and Node system errors (ENOTFOUND,
        // ECONNREFUSED). Programmatic, never prose.
        ...(nodeCode ? { code: nodeCode } : {}),
        ...vendor,
      };
    },
  },
};

/**
 * The stack's frames, without the "Name: message" header Node puts on the
 * front. Written to survive a multi-line message: it seeks the first real
 * frame rather than dropping a fixed number of lines.
 */
function stackFramesOnly(stack: string | undefined): string {
  if (!stack) return '';
  const lines = stack.split('\n');
  const firstFrame = lines.findIndex((line) => /^\s+at\s/.test(line));
  return firstFrame === -1 ? '' : lines.slice(firstFrame).join('\n');
}

/**
 * Pull a vendor's programmatic error code off an error without touching its
 * message. Shaped by structure rather than by importing PlaidApiError, so this
 * module stays free of a dependency on the Plaid layer and so the same
 * treatment covers any other client that adopts the shape.
 */
function vendorErrorCode(err: Error): Record<string, string> {
  const body = (err as { body?: unknown }).body;
  if (body === null || typeof body !== 'object') return {};
  const code = (body as { error_code?: unknown }).error_code;
  const type = (body as { error_type?: unknown }).error_type;
  const out: Record<string, string> = {};
  if (typeof code === 'string') out.vendor_error_code = code;
  if (typeof type === 'string') out.vendor_error_type = type;
  return out;
}
