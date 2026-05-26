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
