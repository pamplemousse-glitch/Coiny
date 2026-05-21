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
