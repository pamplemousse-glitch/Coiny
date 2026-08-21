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
//
// THIRD CONSUMER, added with Sentry (observability/sentry.ts). Sentry ships an
// error payload to a third party, so both mechanisms above apply to it, and a
// third one does too: Sentry's own default integrations attach request data,
// outbound-HTTP breadcrumbs and console output that pino never sees. The four
// primitives below are exported for exactly one reason, which is the line at
// the bottom of this comment block. `FORBIDDEN_KEYS`, `pathOnly`,
// `stackFramesOnly` and `vendorErrorCode` are the policy; the Sentry scrubber
// is a second APPLICATION of that policy, never a second copy of it.
//
// If you find yourself wanting a second configuration, the answer is almost
// always that the first one is wrong.

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
export const FORBIDDEN_KEYS = [
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
  // A crypto wallet address is the single most identifying value that reaches
  // these logs. Unlike a merchant name it is a PERMANENT global identifier
  // whose entire holdings and transaction history are publicly queryable by
  // anyone holding it, forever. Found being logged in the clear at
  // api/nft.ts:86.
  'address',
  'walletAddress',
  'wallet_address',
  // OAuth and handshake material that arrives as a field rather than in a URL.
  'code',
  'codeChallenge',
  'code_challenge',
  'oauthToken',
  'oauth_token',
  'oauthTokenSecret',
  'pin',
  'otp',
];

/** The path, with any query string removed.
 *
 *  Deliberately drops the whole query rather than allowlisting parameter
 *  names: the set of parameters is open (every new route can add one) and the
 *  cost of missing one is a credential in the log stream. A route's identity
 *  is its path, and that is what per-route latency and error rates group by. */
export function pathOnly(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/** How deep `scrubDeep` walks before replacing a subtree wholesale.
 *
 *  A bound rather than a visited set: log payloads are plain data, so the
 *  realistic risk is depth, and a wrong answer at depth 12 is a dropped subtree
 *  rather than a leak. Twelve is far past anything logged here and cheap. */
const MAX_SCRUB_DEPTH = 12;

export const REDACTED = '[redacted]';

/**
 * Censor every forbidden key at ANY depth.
 *
 * This exists because `redact` alone does not do what this file used to claim.
 * The comment here read "deeper nesting is covered by the wildcard at the end
 * of each family", and there was no such wildcard: the deepest path generated
 * was `*.*.key`, so a value at `a.b.c.email` was written in full. Measured, not
 * reasoned about, and pinned by `tests/logger.test.ts`.
 *
 * Path lists are structurally the wrong tool for an open set of shapes. Every
 * finite list is a guess about how deeply someone will nest an object, and the
 * cost of guessing low is a credential in the log stream.
 *
 * Parameterised by the key set because there are two callers with legitimately
 * different sets: pino may write `user_id`, and `observability/sentry.ts` may
 * not, because the log stays in Fly and the Sentry event does not. One
 * mechanism, two policies, rather than two mechanisms.
 */
export function scrubDeep(value: unknown, forbidden: ReadonlySet<string>, depth = 0): unknown {
  if (depth > MAX_SCRUB_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, forbidden, depth + 1));
  if (value === null || typeof value !== 'object') return value;
  // Anything with its own semantics (Date, Buffer, Error) would be flattened to
  // `{}` by the walk below, which corrupts the line rather than protecting it.
  // Left alone: pino's serializers already handle the ones that appear here.
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = forbidden.has(key) ? REDACTED : scrubDeep(v, forbidden, depth + 1);
  }
  return out;
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const FORBIDDEN_SET: ReadonlySet<string> = new Set(FORBIDDEN_KEYS);

/** Every place a forbidden key realistically appears.
 *
 *  Retained alongside `scrubDeep` rather than replaced by it. `redact` runs
 *  inside pino on the serialised output and covers the shallow cases with less
 *  work; `scrubDeep` covers the arbitrary depth `redact` cannot express. Two
 *  controls on the same path, which is the right number for the one that has
 *  already been wrong once. */
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
    censor: REDACTED,
    remove: false,
  },
  formatters: {
    /** The depth-unbounded half of the policy. Runs on the merged object of
     *  every log call, after the serializers below have shaped `req`, `res` and
     *  `err`, so it censors what a path list structurally cannot reach without
     *  undoing their work. */
    log(object: Record<string, unknown>): Record<string, unknown> {
      return scrubDeep(object, FORBIDDEN_SET) as Record<string, unknown>;
    },
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
        // PATH ONLY, query string discarded. This is not tidiness, it is the
        // second leak `redact` structurally cannot reach.
        //
        // OAuth authorization codes arrive as query parameters
        // (api/truelayer.ts:30 reads `code`, api/ynab.ts:49 reads
        // `codeChallenge`), and Fastify's `req.url` is the raw URL including
        // the query. Measured before this line existed: a request to
        // /api/truelayer/callback?code=... logged the code IN FULL, TWICE,
        // once on the request line and once on the completion line. `redact`
        // keys on field names and cannot see inside a string value, so no
        // path list would ever have caught it.
        url: pathOnly(req.url),
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
        // R-31.2, and path-only for the same reason as the request line
        // above. A per-route p95 wants the route, never the parameters.
        url: res.request?.url ? pathOnly(res.request.url) : null,
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
export function stackFramesOnly(stack: string | undefined): string {
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
export function vendorErrorCode(err: Error): Record<string, string> {
  const body = (err as { body?: unknown }).body;
  if (body === null || typeof body !== 'object') return {};
  const code = (body as { error_code?: unknown }).error_code;
  const type = (body as { error_type?: unknown }).error_type;
  const out: Record<string, string> = {};
  if (typeof code === 'string') out.vendor_error_code = code;
  if (typeof type === 'string') out.vendor_error_type = type;
  return out;
}
