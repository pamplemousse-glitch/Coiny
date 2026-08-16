import { createCipheriv, createHmac, randomBytes } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Force encryption key present for all tests.
beforeAll(() => {
  if (!process.env.DATA_ENCRYPTION_KEY) {
    process.env.DATA_ENCRYPTION_KEY = 'a'.repeat(64); // 32-byte hex key
  }
});

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);

/** The envelope exactly as it was written before key versioning existed. */
function legacyEnvelope(keyHex: string, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function versionedEnvelope(version: number, keyHex: string, plaintext: string): string {
  return `v${version}:${legacyEnvelope(keyHex, plaintext)}`;
}

type CryptoModule = typeof import('../src/util/crypto.js');

/** Re-import config and crypto under a different environment. Both read env at
 *  module load, so the module cache has to go with it. */
async function withEnv(env: Record<string, string>, fn: (crypto: CryptoModule) => Promise<void> | void): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    if (v === '') delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  try {
    await fn(await import('../src/util/crypto.js'));
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    vi.resetModules();
  }
}

describe('encryptString / decryptString', () => {
  afterEach(async () => {
    const { _resetCryptoState } = await import('../src/util/crypto.js');
    _resetCryptoState();
  });

  it('produces a version-tagged v<n>:iv:tag:ct envelope', async () => {
    const { encryptString } = await import('../src/util/crypto.js');
    const ct = encryptString('hello world');
    const parts = ct.split(':');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('v1');
    // The three payload parts must be non-empty hex strings.
    for (const p of parts.slice(1)) {
      expect(p).toMatch(/^[0-9a-f]+$/);
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it('round-trips arbitrary UTF-8 strings', async () => {
    const { encryptString, decryptString } = await import('../src/util/crypto.js');
    const inputs = ['simple ascii', 'emoji 🎉', 'json {"key":"val","n":42}', 'a'.repeat(10_000), ''];
    for (const input of inputs) {
      expect(decryptString(encryptString(input))).toBe(input);
    }
  });

  it('generates a unique IV on every call (never reuses nonces)', async () => {
    const { encryptString } = await import('../src/util/crypto.js');
    const ivs = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const ct = encryptString('same plaintext');
      ivs.add(ct.split(':')[1]!);
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
    const [version, iv, tag, ciphertext] = encryptString('secret').split(':') as [string, string, string, string];
    // Flip first byte of auth tag.
    const badTag = (Number.parseInt(tag.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, '0') + tag.slice(2);
    expect(() => decryptString(`${version}:${iv}:${badTag}:${ciphertext}`)).toThrow();
  });

  it('truncated ciphertext throws or returns garbage, never silently passes auth', async () => {
    const { encryptString, decryptString } = await import('../src/util/crypto.js');
    const [version, iv, tag] = encryptString('secret value').split(':') as [string, string, string];
    const truncated = `${version}:${iv}:${tag}:00`;
    // Either throws (auth failure) or produces something other than the original plaintext.
    let result: string | undefined;
    try {
      result = decryptString(truncated);
    } catch {
      return; // threw — good
    }
    expect(result).not.toBe('secret value');
  });
});

// 1.3.4: the pre-0048 tolerance is real, but it is now named, counted and
// switchable rather than the silent default for anything that fails the shape.
describe('legacy plaintext rows', () => {
  afterEach(async () => {
    const { _resetCryptoState } = await import('../src/util/crypto.js');
    _resetCryptoState();
  });

  it('passes a non-envelope value through and counts it', async () => {
    const { decryptString, legacyPlaintextReadCount, _resetCryptoState } = await import('../src/util/crypto.js');
    _resetCryptoState();
    expect(decryptString('not-encrypted')).toBe('not-encrypted');
    // Merchant names legitimately contain colons; that must not read as an envelope.
    expect(decryptString('Cafe: Nero')).toBe('Cafe: Nero');
    expect(legacyPlaintextReadCount()).toBe(2);
  });

  it('leaves the counter alone for real ciphertext', async () => {
    const { encryptString, decryptString, legacyPlaintextReadCount, _resetCryptoState } = await import(
      '../src/util/crypto.js'
    );
    _resetCryptoState();
    decryptString(encryptString('secret'));
    expect(legacyPlaintextReadCount()).toBe(0);
  });

  it('throws instead once ALLOW_LEGACY_PLAINTEXT_READS is turned off', async () => {
    await withEnv({ ALLOW_LEGACY_PLAINTEXT_READS: 'false' }, ({ decryptString, encryptString }) => {
      expect(() => decryptString('not-encrypted')).toThrow(/ALLOW_LEGACY_PLAINTEXT_READS/);
      // Ciphertext is unaffected by the switch.
      expect(decryptString(encryptString('still fine'))).toBe('still fine');
    });
  });
});

// 1.3.5: skipping encryption at write is opt-in and loud, not the consequence
// of an empty variable.
describe('ALLOW_PLAINTEXT_FIELDS', () => {
  it('passes values through when explicitly opted in with no key', async () => {
    await withEnv(
      { DATA_ENCRYPTION_KEY: '', ALLOW_PLAINTEXT_FIELDS: 'true' },
      ({ encryptString, decryptString, blindIndex }) => {
        expect(encryptString('plain')).toBe('plain');
        expect(decryptString('plain')).toBe('plain');
        expect(blindIndex('plain')).toBe('plain');
      },
    );
  });

  it('still refuses to hand back ciphertext as if it were plaintext', async () => {
    const { encryptString } = await import('../src/util/crypto.js');
    const ct = encryptString('secret');
    await withEnv({ DATA_ENCRYPTION_KEY: '', ALLOW_PLAINTEXT_FIELDS: 'true' }, ({ decryptString }) => {
      // The old code returned the envelope string itself here.
      expect(() => decryptString(ct)).toThrow(/no key configured for envelope version/);
    });
  });
});

// 1.3.6: the envelope names its key, both shapes read, and every row written
// before this change still decrypts.
describe('key versioning and rotation', () => {
  it('recognises both envelope shapes', async () => {
    const { isEncrypted, envelopeKeyVersion } = await import('../src/util/crypto.js');
    const key = process.env.DATA_ENCRYPTION_KEY as string;
    expect(isEncrypted(legacyEnvelope(key, 'x'))).toBe(true);
    expect(isEncrypted(versionedEnvelope(3, key, 'x'))).toBe(true);
    expect(isEncrypted('Starbucks #1912')).toBe(false);
    expect(envelopeKeyVersion(legacyEnvelope(key, 'x'))).toBe(1);
    expect(envelopeKeyVersion(versionedEnvelope(3, key, 'x'))).toBe(3);
    expect(envelopeKeyVersion('Starbucks #1912')).toBeNull();
  });

  it('reads an unversioned row written before versioning existed', async () => {
    const { decryptString } = await import('../src/util/crypto.js');
    const key = process.env.DATA_ENCRYPTION_KEY as string;
    expect(decryptString(legacyEnvelope(key, 'pre-versioning row'))).toBe('pre-versioning row');
  });

  it('after rotating to v2, rows written by v1 and by the unversioned scheme both still read', async () => {
    const unversioned = legacyEnvelope(KEY_A, 'written before versioning');
    const v1 = versionedEnvelope(1, KEY_A, 'written by key one');
    await withEnv(
      {
        DATA_ENCRYPTION_KEY: KEY_B,
        DATA_ENCRYPTION_KEY_VERSION: '2',
        DATA_ENCRYPTION_KEYS_PREVIOUS: `1:${KEY_A}`,
      },
      ({ encryptString, decryptString, needsReencryption }) => {
        expect(decryptString(unversioned)).toBe('written before versioning');
        expect(decryptString(v1)).toBe('written by key one');
        // New writes carry the new version and the new key.
        const fresh = encryptString('written by key two');
        expect(fresh.startsWith('v2:')).toBe(true);
        expect(decryptString(fresh)).toBe('written by key two');
        // And the sweep can tell which rows still owe a rewrite.
        expect(needsReencryption(unversioned)).toBe(true);
        expect(needsReencryption(v1)).toBe(true);
        expect(needsReencryption(fresh)).toBe(false);
        expect(needsReencryption('pre-0048 plaintext')).toBe(false);
      },
    );
  });

  it('throws rather than guessing when the envelope names a key it does not have', async () => {
    const { decryptString } = await import('../src/util/crypto.js');
    const key = process.env.DATA_ENCRYPTION_KEY as string;
    expect(() => decryptString(versionedEnvelope(9, key, 'x'))).toThrow(/no key configured for envelope version 9/);
  });
});

// 1.3.3: the blind index no longer shares the AES key.
describe('blindIndex', () => {
  it('is deterministic and hex', async () => {
    const { blindIndex } = await import('../src/util/crypto.js');
    expect(blindIndex('starbucks')).toBe(blindIndex('starbucks'));
    expect(blindIndex('starbucks')).toMatch(/^[0-9a-f]{64}$/);
    expect(blindIndex('starbucks')).not.toBe(blindIndex('pret'));
  });

  it('does not key the HMAC on the encryption key', async () => {
    const { blindIndex } = await import('../src/util/crypto.js');
    const master = Buffer.from(process.env.DATA_ENCRYPTION_KEY as string, 'hex');
    const sharedKey = createHmac('sha256', master).update('starbucks', 'utf8').digest('hex');
    expect(blindIndex('starbucks')).not.toBe(sharedKey);
  });

  it('exposes the old shared-key index read-only so existing rows stay findable', async () => {
    const { blindIndexLegacy } = await import('../src/util/crypto.js');
    const master = Buffer.from(process.env.DATA_ENCRYPTION_KEY as string, 'hex');
    const sharedKey = createHmac('sha256', master).update('starbucks', 'utf8').digest('hex');
    expect(blindIndexLegacy('starbucks')).toBe(sharedKey);
  });
});
