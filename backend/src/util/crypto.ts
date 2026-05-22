import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config.js';

// AES-256-GCM envelope: hex(iv):hex(authTag):hex(ciphertext).
// If DATA_ENCRYPTION_KEY is unset (dev convenience) the helpers pass
// plaintext through unchanged so local-only flows keep working without
// a key set. Production refuses to start without the key (see config.ts).
export function encryptString(plaintext: string): string {
  if (!config.DATA_ENCRYPTION_KEY) return plaintext;
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptString(stored: string): string {
  if (!config.DATA_ENCRYPTION_KEY || !stored.includes(':')) return stored;
  const parts = stored.split(':');
  if (parts.length !== 3) return stored;
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  // nosemgrep: javascript.node-crypto.security.gcm-no-tag-length — authTagLength option is the Node.js equivalent
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(ctHex, 'hex')).toString('utf8') + decipher.final('utf8');
}
