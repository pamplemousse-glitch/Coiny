import { config } from '../config.js';
import type { TransactionPayload } from './types.js';

// Apple's signature chain proves a transaction is genuine. It does not prove it
// was paid for: a Sandbox transaction is signed by the same pinned Apple root,
// carries the same bundle id and the same product id as a real purchase, and
// the only thing separating the two is the `environment` claim. Nothing read it
// before this module existed, so anyone with a sandbox tester account could
// grant themselves a paid tier through POST /api/entitlements/transaction.
//
// The check gates on the server's own environment rather than rejecting
// Sandbox outright, because sandbox transactions are the ONLY kind that exist
// in local development, in tests, and in TestFlight against staging. It is
// only in production that a Sandbox transaction is a free subscription.

export type AppleEnvironment = TransactionPayload['environment'];

export type AppEnv = typeof config.APP_ENV;

/**
 * Whether a verified Apple transaction may grant an entitlement on this server.
 *
 * Outside production every environment is allowed: staging exists to rehearse
 * the release, and every purchase it will ever see is a sandbox one.
 *
 * In production only a Production transaction counts, with one deliberate
 * exception. App Review tests a submitted build against the production backend
 * using sandbox accounts, so during a review window the operator sets
 * APPLE_ALLOW_SANDBOX_ENTITLEMENTS and unsets it once the build is approved.
 * It defaults off, and every sandbox transaction it lets through is logged at
 * warn by the caller, so leaving it on is visible rather than silent.
 */
export function isTransactionEnvironmentAllowed(
  environment: AppleEnvironment,
  appEnv: AppEnv = config.APP_ENV,
  allowSandbox: boolean = config.APPLE_ALLOW_SANDBOX_ENTITLEMENTS,
): boolean {
  if (appEnv !== 'production') return true;
  if (environment === 'Production') return true;
  // Xcode and LocalTesting are locally generated: StoreKit Testing in Xcode
  // signs them with a certificate of the developer's own, and they never
  // reach a production server by any legitimate route. The escape hatch is
  // Sandbox only.
  return environment === 'Sandbox' && allowSandbox;
}
