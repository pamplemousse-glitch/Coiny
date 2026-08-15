import { afterEach, describe, expect, it, vi } from 'vitest';

// config.ts validates at module load, so every case here re-imports it under a
// different environment. 1.3.8: a malformed or absent key must fail the boot,
// not the first write of a real user's token.

const VALID_KEY = 'a'.repeat(64);

async function loadConfigWith(env: Record<string, string>): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    if (v === '') delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  try {
    await import('../src/config.js');
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe('DATA_ENCRYPTION_KEY validation', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('accepts a 64-char lowercase hex key', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: VALID_KEY })).resolves.toBeUndefined();
  });

  it('rejects a key of the wrong length at load, not at first use', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: 'a'.repeat(63) })).rejects.toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it('rejects a key that is not hex', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: 'z'.repeat(64) })).rejects.toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it('rejects uppercase hex, which would silently be a different key on some paths', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: 'A'.repeat(64) })).rejects.toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it('never echoes the key in the error message', async () => {
    let message = '';
    try {
      await loadConfigWith({ DATA_ENCRYPTION_KEY: 'deadbeef' });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toMatch(/DATA_ENCRYPTION_KEY/);
    expect(message).not.toContain('deadbeef');
  });
});

describe('ALLOW_PLAINTEXT_FIELDS', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('refuses to load with no key and no explicit opt-in', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: '' })).rejects.toThrow(/ALLOW_PLAINTEXT_FIELDS/);
  });

  it('loads with no key when the opt-in is explicit', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: '', ALLOW_PLAINTEXT_FIELDS: 'true' })).resolves.toBeUndefined();
  });

  it('is rejected in production, which covers staging too (NODE_ENV is production there)', async () => {
    await expect(
      loadConfigWith({
        NODE_ENV: 'production',
        ALLOW_PLAINTEXT_FIELDS: 'true',
        DATA_ENCRYPTION_KEY: VALID_KEY,
        PLAID_CLIENT_ID: 'x',
        PLAID_SECRET: 'x',
        PLAID_WEBHOOK_URL: 'https://example.test/hook',
        DATABASE_URL: 'postgres://example',
      }),
    ).rejects.toThrow(/ALLOW_PLAINTEXT_FIELDS/);
  });

  it('reads the string "false" as false, not as a truthy string', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: '', ALLOW_PLAINTEXT_FIELDS: 'false' })).rejects.toThrow(
      /ALLOW_PLAINTEXT_FIELDS/,
    );
  });

  it('rejects a spelling it does not understand rather than guessing', async () => {
    await expect(loadConfigWith({ DATA_ENCRYPTION_KEY: VALID_KEY, ALLOW_PLAINTEXT_FIELDS: 'yes' })).rejects.toThrow(
      /ALLOW_PLAINTEXT_FIELDS/,
    );
  });
});

describe('rotation keyring', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('accepts version:key pairs', async () => {
    await expect(
      loadConfigWith({
        DATA_ENCRYPTION_KEY: VALID_KEY,
        DATA_ENCRYPTION_KEY_VERSION: '3',
        DATA_ENCRYPTION_KEYS_PREVIOUS: `1:${'b'.repeat(64)},2:${'c'.repeat(64)}`,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects a malformed keyring entry', async () => {
    await expect(
      loadConfigWith({ DATA_ENCRYPTION_KEY: VALID_KEY, DATA_ENCRYPTION_KEYS_PREVIOUS: 'nope' }),
    ).rejects.toThrow(/DATA_ENCRYPTION_KEYS_PREVIOUS/);
  });

  it('rejects a keyring that redefines the version currently being written', async () => {
    await expect(
      loadConfigWith({
        DATA_ENCRYPTION_KEY: VALID_KEY,
        DATA_ENCRYPTION_KEY_VERSION: '2',
        DATA_ENCRYPTION_KEYS_PREVIOUS: `2:${'b'.repeat(64)}`,
      }),
    ).rejects.toThrow(/DATA_ENCRYPTION_KEYS_PREVIOUS/);
  });

  it('rejects a keyring that names the same old version twice', async () => {
    await expect(
      loadConfigWith({
        DATA_ENCRYPTION_KEY: VALID_KEY,
        DATA_ENCRYPTION_KEY_VERSION: '3',
        DATA_ENCRYPTION_KEYS_PREVIOUS: `1:${'b'.repeat(64)},1:${'c'.repeat(64)}`,
      }),
    ).rejects.toThrow(/DATA_ENCRYPTION_KEYS_PREVIOUS/);
  });
});
