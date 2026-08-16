import { describe, expect, it } from 'vitest';
import { type AppleEnvironment, isTransactionEnvironmentAllowed } from '../src/appstore/environment.js';

const ALL: AppleEnvironment[] = ['Production', 'Sandbox', 'Xcode', 'LocalTesting'];

describe('isTransactionEnvironmentAllowed', () => {
  // Every purchase local development, the test suite and TestFlight against
  // staging will ever see is a sandbox one. Gating on the transaction alone
  // would make paid features untestable anywhere.
  it('allows every environment outside production', () => {
    for (const appEnv of ['local', 'staging'] as const) {
      for (const environment of ALL) {
        expect(isTransactionEnvironmentAllowed(environment, appEnv, false)).toBe(true);
      }
    }
  });

  it('allows a production transaction in production', () => {
    expect(isTransactionEnvironmentAllowed('Production', 'production', false)).toBe(true);
  });

  // The finding: a Sandbox transaction carries the same Apple chain and the
  // same bundle id as a real one, so a sandbox tester account was a free
  // subscription.
  it('rejects a sandbox transaction in production', () => {
    expect(isTransactionEnvironmentAllowed('Sandbox', 'production', false)).toBe(false);
  });

  it('accepts a sandbox transaction in production only with the App Review flag on', () => {
    expect(isTransactionEnvironmentAllowed('Sandbox', 'production', true)).toBe(true);
  });

  // Xcode and LocalTesting are signed locally by the developer. No legitimate
  // route brings them to a production server, so the flag does not cover them.
  it('rejects locally signed environments in production even with the flag on', () => {
    expect(isTransactionEnvironmentAllowed('Xcode', 'production', true)).toBe(false);
    expect(isTransactionEnvironmentAllowed('LocalTesting', 'production', true)).toBe(false);
  });
});
