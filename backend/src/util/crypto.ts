import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { config } from '../config.js';

// AES-256-GCM envelope: hex(iv):hex(authTag):hex(ciphertext).
// iv is always 12 bytes (24 hex chars) and the auth tag 16 bytes (32 hex
// chars), so the envelope has a fixed recognisable shape. decryptString uses
// this to tell ciphertext from legacy plaintext rows written before a column
// was encrypted: anything that does not match the shape is returned as-is.
const ENVELOPE_RE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/;

/** Whether a stored value has the ciphertext envelope shape. Used by the 0048
 *  backfill to skip rows that are already encrypted (re-running is safe). */
export function isEncrypted(stored: string): boolean {
  return ENVELOPE_RE.test(stored);
}

// AES-256-GCM envelope: hex(iv):hex(authTag):hex(ciphertext).
// DATA_ENCRYPTION_KEY is required in production (config.ts enforces this).
// In dev/test without a key set, encryption is skipped as a convenience —
// the server will refuse to start in production if the key is missing.
export function encryptString(plaintext: string): string {
  if (!config.DATA_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('encryptString called without DATA_ENCRYPTION_KEY in production');
    }
    return plaintext;
  }
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptString(stored: string): string {
  if (!config.DATA_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('decryptString called without DATA_ENCRYPTION_KEY in production');
    }
    return stored;
  }
  // Legacy tolerance: rows written before their column was encrypted are
  // plaintext. Plaintext can legitimately contain colons (merchant names do),
  // so shape-match the whole envelope, not just count the separators.
  if (!ENVELOPE_RE.test(stored)) return stored;
  const [ivHex, tagHex, ctHex] = stored.split(':') as [string, string, string];
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  // nosemgrep: javascript.node-crypto.security.gcm-no-tag-length — authTagLength option is the Node.js equivalent
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(ctHex, 'hex')).toString('utf8') + decipher.final('utf8');
}

// Null-passing wrappers for nullable PII columns (transactions.merchant_name,
// plaid_recurring_streams.merchant_name). Same key, same envelope, same
// dev/test passthrough and legacy-plaintext tolerance as the string versions.
export function encryptNullable(plaintext: string | null): string | null {
  return plaintext === null ? null : encryptString(plaintext);
}

export function decryptNullable(stored: string | null): string | null {
  return stored === null ? null : decryptString(stored);
}

/**
 * Deterministic keyed index (HMAC-SHA256, hex) for columns that must support
 * SQL equality lookups but must not store plaintext; category_overrides
 * .merchant_name is keyed on this. Deterministic on purpose: the same
 * normalized merchant always maps to the same index so upserts and lookups
 * work, at the accepted cost of revealing which override rows share a
 * merchant (nothing more, since the HMAC is not reversible without the key).
 *
 * Mirrors encryptString's posture: with no DATA_ENCRYPTION_KEY outside
 * production the value passes through unchanged, and production refuses to
 * boot without the key (config.ts).
 */
export function blindIndex(value: string): string {
  if (!config.DATA_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('blindIndex called without DATA_ENCRYPTION_KEY in production');
    }
    return value;
  }
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}
