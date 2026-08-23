import { z } from 'zod';

// 32 raw bytes, lowercase hex. Anything else is a malformed key, and a
// malformed key must fail the boot rather than the first createCipheriv call,
// which would be the first write of a real user's token.
const HEX_KEY_RE = /^[0-9a-f]{64}$/;

// "<version>:<64 hex>" pairs, comma separated. Versions are the same integers
// the ciphertext envelope carries (util/crypto.ts).
const KEYRING_RE = /^[0-9]{1,3}:[0-9a-f]{64}(,[0-9]{1,3}:[0-9a-f]{64})*$/;

// Env vars are strings, and z.coerce.boolean() reads the string 'false' as
// true, which is exactly the wrong failure mode for a flag that disables
// encryption. Accept the four spellings that mean something and reject the
// rest.
function envBool(defaultValue: boolean) {
  return z
    .enum(['true', 'false', '1', '0'])
    .default(defaultValue ? 'true' : 'false')
    .transform((v) => v === 'true' || v === '1');
}

const configSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    // Which deployed environment this is. Distinct from NODE_ENV, which stays
    // 'production' in BOTH staging and production so that Fastify, Node and
    // every library behave identically in the environment that rehearses
    // releases and the one that serves them.
    //
    // Never infer the environment from PLAID_ENV: staging and production both
    // run Plaid sandbox today, and production will keep running sandbox until
    // the production credentials clear review. That is exactly the trap
    // .claude/rules and CLAUDE.md warn about.
    APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    PLAID_CLIENT_ID: z.string().default(''),
    PLAID_SECRET: z.string().default(''),
    PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
    PLAID_WEBHOOK_URL: z.string().default(''),

    DATABASE_URL: z.string().default(''),

    APNS_KEY_ID: z.string().default(''),
    APNS_TEAM_ID: z.string().default(''),
    APNS_KEY: z.string().default(''),
    APNS_BUNDLE_ID: z.string().default('app.coiny.ios'),

    // 64-char hex string (32 raw bytes) for AES-256-GCM encryption of every
    // PII and credential column. Required in production. Shape is checked here
    // rather than at first use: a key of the wrong length used to pass boot and
    // throw on the first real write.
    DATA_ENCRYPTION_KEY: z
      .string()
      .default('')
      .refine((v) => v === '' || HEX_KEY_RE.test(v), 'must be 64 lowercase hex characters (32 bytes)'),

    // Key version stamped into every envelope this process writes. Rotation is:
    // move the outgoing key into DATA_ENCRYPTION_KEYS_PREVIOUS under its own
    // version, put the new key in DATA_ENCRYPTION_KEY, bump this, deploy, then
    // run scripts/rotate-encryption-key.ts to sweep the stored rows.
    DATA_ENCRYPTION_KEY_VERSION: z.coerce.number().int().min(1).max(999).default(1),

    // Decrypt-only keyring: keys that no longer write but still have rows,
    // as "<version>:<64 hex>" pairs. Empty until the first rotation. Envelopes
    // written before versioning existed are read at version 1, so a rotation
    // away from version 1 must keep the version-1 key listed here until the
    // sweep reports zero rows left.
    DATA_ENCRYPTION_KEYS_PREVIOUS: z
      .string()
      .default('')
      .refine((v) => v === '' || KEYRING_RE.test(v), 'must be comma-separated <version>:<64 hex> pairs'),

    // Opt-in, deliberately loud: with no key set, field encryption becomes a
    // no-op and PII is stored as it arrives. This exists so tests and a first
    // local run work without a key. It is rejected in production below, and
    // config load fails outright when neither this nor a key is present, so
    // the no-op can never be the quiet default a staging box drifts into.
    ALLOW_PLAINTEXT_FIELDS: envBool(false),

    // Bounded tolerance for rows written before migration 0048 encrypted their
    // column: a stored value that is not a ciphertext envelope is returned as
    // it was found. True by default because those rows exist and must stay
    // readable. Set false once scripts/backfill-encrypt-pii.ts reports zero
    // rewrites for a deployment; after that a non-envelope value is a defect,
    // not a legacy row, and reading it should fail loudly.
    ALLOW_LEGACY_PLAINTEXT_READS: envBool(true),

    // Apple bundle ID used to verify the `aud` claim in Apple identity tokens.
    // Doubles as `client_id` on Apple's REST API (token exchange and revoke).
    APPLE_BUNDLE_ID: z.string().default('app.coiny.ios'),

    // Sign in with Apple REST API credentials, used only to revoke the user's
    // grant on account deletion (TN3194). All three are needed to build the
    // ES256 client secret; when any is empty the revoke call is skipped and
    // logged rather than attempted, and deletion proceeds regardless.
    //
    //   APPLE_TEAM_ID              the 10-character Apple Developer team id (JWT `iss`)
    //   APPLE_SIGN_IN_KEY_ID       the key id of the Sign in with Apple .p8 (JWT `kid`)
    //   APPLE_SIGN_IN_PRIVATE_KEY  the PKCS#8 PEM body of that .p8, verbatim
    //
    // Stored and read the same way as APNS_KEY, which is the same shape of
    // secret from the same developer account.
    APPLE_TEAM_ID: z.string().default(''),
    APPLE_SIGN_IN_KEY_ID: z.string().default(''),
    APPLE_SIGN_IN_PRIVATE_KEY: z.string().default(''),

    // Lets a StoreKit Sandbox transaction grant a paid entitlement when
    // APP_ENV is 'production'. Off everywhere by default, and irrelevant
    // outside production, where sandbox transactions are the only kind there
    // is. Turn it on only for an App Review window (reviewers buy with sandbox
    // accounts against the production backend) and turn it off on approval:
    // while it is on, anyone with a sandbox tester account can subscribe for
    // free. See src/appstore/environment.ts.
    APPLE_ALLOW_SANDBOX_ENTITLEMENTS: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),

    // Google OAuth client ID used as the `aud` claim audience when verifying
    // ID tokens from the Android Credential Manager flow. Should be the WEB
    // application client ID configured as `serverClientId` in the Android app,
    // not the Android client ID. When empty, /api/auth/google returns 503.
    GOOGLE_AUTH_CLIENT_ID: z.string().default(''),

    // Sentry error tracking (docs/launch-gap-analysis.md section 9, resolved
    // 2026-08-21 in favour of adopting it with the full compliance set rather
    // than staying first-party).
    //
    // Empty by default and empty everywhere except the deployed apps, which is
    // load-bearing rather than convenient: with no DSN the SDK is never
    // initialised, so tests, CI and a local run send nothing to a third party
    // and cannot be made to by a stray import. `observability/sentry.ts` is
    // written so every one of its entry points is a no-op in that state.
    SENTRY_DSN: z.string().default(''),

    // Errors only. Tracing spans carry route parameters, database statements
    // and outbound URLs, none of which have been through the redaction policy
    // in plugins/logger.ts, and none of which we need to answer "what broke".
    // Raise this only alongside a scrubbing story for spans.
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),

    // Events per rolling window, and per distinct error key inside it.
    //
    // The free plan allows 5,000 errors a month, which is about 166 a day, and
    // `util/fetch.ts` currently retries up to 3 times per logical call with no
    // budget. One vendor outage across a sweep can therefore emit thousands of
    // identical events and exhaust a month of quota in an afternoon, at which
    // point the NEXT incident is invisible. Capping is what keeps error
    // tracking working during the failure it exists for.
    // Fraction of a class value that must be lost in ONE refresh before it
    // counts as a collapse (src/resilience/invariants.ts). 0.9 is far above
    // any normal market movement on purpose: a threshold that fires on a bad
    // day in the market gets muted, and a muted alert is worse than no alert
    // because it reads as coverage. The Polkadot incident was a ~99% drop.
    INVARIANT_COLLAPSE_RATIO: z.coerce.number().positive().max(1).default(0.9),

    // Retry throttling, gRFC A6's token bucket (src/resilience/retry-budget.ts).
    //
    // 20 tokens with a threshold at half means a vendor gets ten retryable
    // failures before retries stop, which is roughly three or four logical
    // calls at the current three-attempt ladder. The ratio is Google SRE's
    // recommended 10% retry budget: ten good responses buy back one bad one.
    RETRY_BUDGET_MAX_TOKENS: z.coerce.number().int().positive().default(20),
    RETRY_BUDGET_TOKEN_RATIO: z.coerce.number().positive().max(1).default(0.1),

    // Vendor-level circuit breaking (src/resilience/circuit-breaker.ts).
    //
    // Two detectors, because one of them cannot work at our volume. The
    // consecutive threshold is Envoy's `consecutive_5xx` default, and it is the
    // one that will actually fire today: at roughly one sample per refresh
    // interval a RATE cannot be computed at all, which is the whole finding in
    // connection-resilience-survey.md section 3.
    BREAKER_CONSECUTIVE_THRESHOLD: z.coerce.number().int().positive().default(5),

    // The rate path, gated behind a volume floor the way Envoy gates its
    // success-rate detector. Silent at today's volume BY CONSTRUCTION: 20
    // requests inside a five-minute window is far more than one vendor sees.
    // It is here so the breaker does not need reopening when volume arrives,
    // and it catches the failure a streak counter cannot: a vendor failing half
    // its requests forever while never failing two in a row.
    BREAKER_WINDOW_MS: z.coerce.number().int().positive().default(300_000),
    BREAKER_WINDOW_BUCKETS: z.coerce.number().int().positive().default(10),
    BREAKER_VOLUME_FLOOR: z.coerce.number().int().positive().default(20),
    BREAKER_FAILURE_RATE: z.coerce.number().positive().max(1).default(0.5),

    // Ejection duration: base x 2^(ejections - 1), capped. Envoy's shape.
    // Thirty seconds is short enough that a brief blip costs one refresh cycle,
    // and the ten-minute cap is short enough that a recovered vendor is not
    // locked out for the rest of the day.
    BREAKER_BASE_EJECTION_MS: z.coerce.number().int().positive().default(30_000),
    BREAKER_MAX_EJECTION_MS: z.coerce.number().int().positive().default(600_000),

    // How long a half-open probe may stay outstanding before it is abandoned.
    // Without this the breaker has a permanent-refusal bug: a probe whose
    // caller crashes or never reports leaves the vendor refused forever with
    // nothing able to clear it. Comfortably longer than fetch.ts's own request
    // timeout, so a probe that is merely slow is not abandoned while in flight.
    BREAKER_PROBE_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

    // Envoy's `max_ejection_percent`. This is a blast-radius bound on THIS
    // MODULE, not on the vendors: without it, one bug here stops every refresh
    // for every vendor and the product silently stops updating. A breaker that
    // can brick the product is a worse risk than the amplification it prevents.
    BREAKER_MAX_EJECTION_PERCENT: z.coerce.number().int().positive().max(100).default(50),

    // Full-jitter backoff (AWS, "Exponential Backoff And Jitter"):
    // `random(0, min(cap, base * 2^attempt))`. Base and cap only; the ladder is
    // computed rather than listed, because a fixed list is what produced
    // synchronised retries in the first place.
    RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(200),
    RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().default(2_000),

    SENTRY_MAX_EVENTS_PER_WINDOW: z.coerce.number().int().positive().default(20),
    SENTRY_MAX_EVENTS_PER_KEY: z.coerce.number().int().positive().default(3),
    SENTRY_RATE_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 60 * 1000),

    // Rate-limit knobs. Per-key budget for the global limiter (keyed on
    // bearer-token hash, falling back to req.ip for unauthenticated traffic).
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.string().default('1 second'),

    // Server-side deadlines. Both default to disabled in Fastify, which is what
    // let `POST /api/net-worth/refresh` hold a socket for its whole worst case
    // (roughly 154 s of sequential vendor budgets) with nothing to stop it.
    //
    //   REQUEST_TIMEOUT_MS     http.Server#requestTimeout: how long the client
    //                          has to finish sending a request. Bounds a slow
    //                          or stalled upload, not the handler.
    //   CONNECTION_TIMEOUT_MS  http.Server#timeout: socket inactivity. This is
    //                          the one that bounds a slow fan-out, because a
    //                          handler awaiting sixteen vendors sends no bytes
    //                          while it waits.
    //
    // 120 s sits below the 154 s worst case on purpose and far above the p99 of
    // every other route; the iOS client already gives up at 30 s. It is above
    // the 72 s keep-alive idle timeout, so idle pooled connections are still
    // closed by keep-alive rather than by this.
    REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

    // Coinbase Advanced Trade API (ECDSA key pair).
    COINBASE_API_KEY_ID: z.string().default(''),
    COINBASE_API_KEY_SECRET: z.string().default(''), // PEM-encoded EC private key
    COINBASE_BASE_URL: z.string().default('https://api.coinbase.com'),

    // Zerion DeFi portfolio API.
    ZERION_API_KEY: z.string().default(''),

    // Spinwheel student/consumer debt API.
    SPINWHEEL_SECRET_KEY: z.string().default(''),
    // Standard host. Sandbox: https://sandbox-api.spinwheel.io  Prod: https://api.spinwheel.io
    SPINWHEEL_BASE_URL: z.string().url().default('https://sandbox-api.spinwheel.io'),

    // RentCast AVM — real estate property value estimates.
    RENTCAST_API_KEY: z.string().default(''),

    // MarketCheck — vehicle value estimates.
    MARKETCHECK_API_KEY: z.string().default(''),

    // GoldAPI.io — precious metals spot prices.
    GOLDAPI_API_KEY: z.string().default(''),

    // Subscan API key for Polkadot (DOT) balance queries.
    SUBSCAN_API_KEY: z.string().default(''),
    // Blockfrost project ID for Cardano (ADA) balance queries.
    BLOCKFROST_PROJECT_ID: z.string().default(''),
    // TonCenter API key for TON balance queries.
    TONCENTER_API_KEY: z.string().default(''),

    // KicksDB — sneaker pricing API (StockX + GOAT + others). kicks.dev
    KICKSDB_API_KEY: z.string().default(''),

    // Discogs OAuth 1.0a — vinyl collection valuation.
    DISCOGS_CONSUMER_KEY: z.string().default(''),
    DISCOGS_CONSUMER_SECRET: z.string().default(''),

    // YNAB OAuth 2.0 client ID (PKCE public client — no client secret needed).
    // Register at app.ynab.com/settings/developer to get a client ID.
    YNAB_CLIENT_ID: z.string().default(''),

    // Helius — Solana RPC + enhanced APIs (staking, DAS).
    HELIUS_API_KEY: z.string().default(''),

    // Alchemy — NFT portfolio API (Ethereum, Polygon, Base, etc.)
    ALCHEMY_API_KEY: z.string().default(''),

    // Kalshi prediction markets. demo = demo-api.kalshi.co, prod = external-api.kalshi.com
    KALSHI_ENV: z.enum(['demo', 'prod']).default('demo'),

    // TrueLayer Open Banking (UK + EU bank accounts).
    TRUELAYER_CLIENT_ID: z.string().default(''),
    TRUELAYER_CLIENT_SECRET: z.string().default(''),
    TRUELAYER_ENV: z.enum(['sandbox', 'live']).default('sandbox'),

    // PokemonPriceTracker — TCGPlayer-sourced Pokémon card prices.
    POKEMONPRICETRACKER_API_KEY: z.string().default(''),

    // EIA Open Data — energy commodity spot prices (WTI crude, natural gas, etc.)
    // Free key: https://www.eia.gov/opendata/register.php
    EIA_API_KEY: z.string().default(''),

    // USDA NASS Quick Stats — farmland value per acre by state.
    // Free key: https://quickstats.nass.usda.gov/api
    USDA_NASS_API_KEY: z.string().default(''),

    // TCGapi — trading card market prices (tcgapi.dev). Free tier: 100 req/day.
    TCGAPI_KEY: z.string().default(''),

    // PCGS Public API — graded coin price guide (pcgs.com/publicapi). Bearer token from website.
    PCGS_API_KEY: z.string().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.PLAID_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PLAID_CLIENT_ID'],
          message: 'PLAID_CLIENT_ID required in production',
        });
      }
      if (!data.PLAID_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PLAID_SECRET'],
          message: 'PLAID_SECRET required in production',
        });
      }
      if (!data.PLAID_WEBHOOK_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PLAID_WEBHOOK_URL'],
          message: 'PLAID_WEBHOOK_URL required in production',
        });
      }
      if (!data.DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL required in production',
        });
      }
      if (!data.DATA_ENCRYPTION_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATA_ENCRYPTION_KEY'],
          message: 'DATA_ENCRYPTION_KEY required in production',
        });
      }
      // NODE_ENV is 'production' on staging too (see APP_ENV above), which is
      // the point: staging carries production-shaped data and must not be one
      // config edit away from storing it in the clear.
      if (data.ALLOW_PLAINTEXT_FIELDS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ALLOW_PLAINTEXT_FIELDS'],
          message: 'ALLOW_PLAINTEXT_FIELDS must not be set in production',
        });
      }
    }

    // Storing PII unencrypted is a decision someone has to make on purpose.
    if (!data.DATA_ENCRYPTION_KEY && !data.ALLOW_PLAINTEXT_FIELDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATA_ENCRYPTION_KEY'],
        message: 'DATA_ENCRYPTION_KEY is empty; set it, or set ALLOW_PLAINTEXT_FIELDS=true to store fields in clear',
      });
    }

    // A keyring that redefines the writing version would make the envelope's
    // version meaningless: the same tag would name two different keys.
    if (data.DATA_ENCRYPTION_KEYS_PREVIOUS) {
      const seen = new Set<number>([data.DATA_ENCRYPTION_KEY_VERSION]);
      for (const entry of data.DATA_ENCRYPTION_KEYS_PREVIOUS.split(',')) {
        const version = Number(entry.split(':')[0]);
        if (seen.has(version)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['DATA_ENCRYPTION_KEYS_PREVIOUS'],
            message: `duplicate key version ${version}`,
          });
        }
        seen.add(version);
      }
    }
  });

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    // Path plus message, never the offending value: these are secrets.
    const missing = result.error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', ');
    throw new Error(`Invalid configuration: ${missing}`);
  }
  return result.data;
}

export const config = loadConfig();

/**
 * Whether the SHARED, server-owned Coinbase API key may be used to serve a
 * user's data.
 *
 * `coinbase_connections.mode = 'dev_key'` does not store per-user credentials:
 * it is a flag meaning "sign with the operator's key". That is a local
 * development convenience. In a multi-user deployment it means every user who
 * connects Coinbase sees the OPERATOR's balances counted as their own, which is
 * a cross-user data exposure and violates .claude/rules/security.md #6.
 *
 * Per-user Coinbase requires the OAuth path (the token columns exist in the
 * schema but are never written). Until that is built, shared-key mode is
 * confined to non-production.
 */
export function isSharedCoinbaseKeyAllowed(): boolean {
  return config.NODE_ENV !== 'production';
}
