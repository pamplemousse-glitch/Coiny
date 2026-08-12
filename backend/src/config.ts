import { z } from 'zod';

const configSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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

    // 64-char hex string (32 raw bytes) for AES-256-GCM encryption of Plaid access_token.
    // Required in production. If empty in dev/test, access tokens are stored plaintext.
    DATA_ENCRYPTION_KEY: z.string().default(''),

    // Apple bundle ID used to verify the `aud` claim in Apple identity tokens.
    APPLE_BUNDLE_ID: z.string().default('app.coiny.ios'),

    // Google OAuth client ID used as the `aud` claim audience when verifying
    // ID tokens from the Android Credential Manager flow. Should be the WEB
    // application client ID configured as `serverClientId` in the Android app,
    // not the Android client ID. When empty, /api/auth/google returns 503.
    GOOGLE_AUTH_CLIENT_ID: z.string().default(''),

    // Rate-limit knobs. Per-key budget for the global limiter (keyed on
    // bearer-token hash, falling back to req.ip for unauthenticated traffic).
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.string().default('1 second'),

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

    // SnapTrade brokerage aggregator (Fidelity, Vanguard, Schwab, Robinhood, etc.)
    SNAPTRADE_CLIENT_ID: z.string().default(''),
    SNAPTRADE_CONSUMER_KEY: z.string().default(''),

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
    }
  });

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
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
