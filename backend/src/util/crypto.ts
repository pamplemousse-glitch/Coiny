import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config.js';

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
  if (!stored.includes(':')) return stored;
  const parts = stored.split(':');
  if (parts.length !== 3) return stored;
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  // nosemgrep: javascript.node-crypto.security.gcm-no-tag-length — authTagLength option is the Node.js equivalent
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(ctHex, 'hex')).toString('utf8') + decipher.final('utf8');
}
