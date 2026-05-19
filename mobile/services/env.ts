// Public runtime config, sourced from EXPO_PUBLIC_* env vars (see .env.example).
// These are inlined into the bundle at build time — never put secrets here.

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export const TELLER_APPLICATION_ID = process.env.EXPO_PUBLIC_TELLER_APPLICATION_ID ?? '';

const TELLER_ENVIRONMENTS = ['sandbox', 'development', 'production'] as const;
export type TellerEnvironment = (typeof TELLER_ENVIRONMENTS)[number];

function parseTellerEnvironment(value: string | undefined): TellerEnvironment {
  return (TELLER_ENVIRONMENTS as readonly string[]).includes(value ?? '')
    ? (value as TellerEnvironment)
    : 'sandbox';
}

export const TELLER_ENVIRONMENT = parseTellerEnvironment(process.env.EXPO_PUBLIC_TELLER_ENVIRONMENT);
