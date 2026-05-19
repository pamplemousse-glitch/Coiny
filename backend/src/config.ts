import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  TELLER_APPLICATION_ID: z.string().min(1),
  TELLER_CERT_PATH: z.string().min(1),
  TELLER_KEY_PATH: z.string().min(1),
  TELLER_SIGNING_SECRET: z.string().default(''),
  TELLER_ENVIRONMENT: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
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
