/**
 * D3 — Coinbase integration tests
 *
 * Requires:
 *   source bin/load-secrets.sh
 *   INTEGRATION_TEST=1 pnpm --filter coiny-backend test backend/tests/integration/coinbase.test.ts
 *
 * NOTE: The Coinbase EC private key stored in Keychain (coiny-coinbase-sandbox-api-key-secret)
 * appears to be truncated at 128 characters. A full P-256 PEM is ~225 chars.
 * To fix: re-enter the full key with the interactive form:
 *   security add-generic-password -a "$USER" -s "coiny-coinbase-sandbox-api-key-secret" -w
 * Then paste the full PEM (including -----BEGIN EC PRIVATE KEY----- through -----END-----).
 */
import { describe, it, expect } from 'vitest';
import { getAccounts } from '../../src/coinbase/client.js';

// Skip if key is truncated (a valid P-256 PEM needs at least 200 chars after normalization).
const keyRaw = (process.env.COINBASE_API_KEY_SECRET ?? '').replace(/\\n/g, '\n');
const keyOk = keyRaw.length >= 200 && keyRaw.includes('END');

const skip = !process.env.INTEGRATION_TEST || !process.env.COINBASE_API_KEY_ID || !keyOk;

describe('Coinbase — accounts', () => {
  it.skipIf(skip)('getAccounts returns array of account objects', async () => {
    const accounts = await getAccounts();

    expect(Array.isArray(accounts)).toBe(true);
    const account = accounts[0];
    if (account) {
      expect(typeof account.uuid).toBe('string');
      expect(typeof account.currency).toBe('string');
      expect(typeof account.available_balance).toBe('object');
      expect(typeof account.available_balance.value).toBe('string');
      expect(typeof account.available_balance.currency).toBe('string');
    }
  });
});
