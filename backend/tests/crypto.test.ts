import { beforeAll, describe, expect, it, vi } from 'vitest';

// Force encryption key present for all tests.
beforeAll(() => {
  if (!process.env.DATA_ENCRYPTION_KEY) {
    process.env.DATA_ENCRYPTION_KEY = 'a'.repeat(64); // 32-byte hex key
  }
});

describe('encryptString / decryptString', () => {
  it('produces iv:tag:ct envelope format', async () => {
    const { encryptString } = await import('../src/util/crypto.js');
    const ct = encryptString('hello world');
    const parts = ct.split(':');
    expect(parts).toHaveLength(3);
    // All parts must be non-empty hex strings.
    for (const p of parts) {
      expect(p).toMatch(/^[0-9a-f]+$/);
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it('round-trips arbitrary UTF-8 strings', async () => {
    const { encryptString, decryptString } = await import('../src/util/crypto.js');
    const inputs = [
      'simple ascii',
      'emoji 🎉',
      'json {"key":"val","n":42}',
      'a'.repeat(10_000),
      '',
    ];
    for (const input of inputs) {
      expect(decryptString(encryptString(input))).toBe(input);
    }
  });

  it('generates a unique IV on every call (never reuses nonces)', async () => {
    const { encryptString } = await import('../src/util/crypto.js');
    const ivs = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const ct = encryptString('same plaintext');
      const iv = ct.split(':')[0];
      ivs.add(iv!);
    }
    // All 200 IVs must be distinct — IV reuse with GCM is catastrophic.
    expect(ivs.size).toBe(200);
  });

  it('different plaintexts produce different ciphertexts', async () => {
    const { encryptString } = await import('../src/util/crypto.js');
    expect(encryptString('a')).not.toBe(encryptString('b'));
  });

  it('corrupted auth tag causes GCM authentication failure (throws)', async () => {
    const { encryptString, decryptString } = await import('../src/util/crypto.js');
    const ct = encryptString('secret');
    const [iv, tag, ciphertext] = ct.split(':') as [string, string, string];
    // Flip first byte of auth tag.
    const badTag = ((parseInt(tag.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, '0')) + tag.slice(2);
    const tampered = `${iv}:${badTag}:${ciphertext}`;
    expect(() => decryptString(tampered)).toThrow();
  });

  it('truncated ciphertext throws or returns garbage, never silently passes auth', async () => {
    const { encryptString, decryptString } = await import('../src/util/crypto.js');
    const ct = encryptString('secret value');
    const [iv, tag] = ct.split(':') as [string, string];
    const truncated = `${iv}:${tag}:00`;
    // Either throws (auth failure) or produces something other than the original plaintext.
    let result: string | undefined;
    try {
      result = decryptString(truncated);
    } catch {
      return; // threw — good
    }
    expect(result).not.toBe('secret value');
  });

  it('passthrough when DATA_ENCRYPTION_KEY is unset (dev convenience)', async () => {
    const saved = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = '';
    // Reset module cache so config.ts re-reads the now-empty env var.
    vi.resetModules();
    const { decryptString, encryptString } = await import('../src/util/crypto.js');
    expect(encryptString('plain')).toBe('plain');
    expect(decryptString('plain')).toBe('plain');
    process.env.DATA_ENCRYPTION_KEY = saved;
    vi.resetModules();
  });

  it('returns stored value unchanged when it is not an iv:tag:ct envelope', async () => {
    const { decryptString } = await import('../src/util/crypto.js');
    // A plain string with no colons — dev passthrough value.
    expect(decryptString('not-encrypted')).toBe('not-encrypted');
  });
});
