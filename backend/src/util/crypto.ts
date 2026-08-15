import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';
import { config } from '../config.js';

// AES-256-GCM. Two envelope shapes are readable, exactly one is written:
//
//   v<n>:hex(iv):hex(tag):hex(ct)   written now; <n> names the key that wrote it
//   hex(iv):hex(tag):hex(ct)        written before key versioning existed
//
// iv is always 12 bytes (24 hex chars) and the auth tag 16 bytes (32 hex
// chars), so both shapes are recognisable by shape alone and neither can be
// confused with a merchant name, which may contain colons.
//
// Unversioned rows are read with key version 1 because that is the only key
// that ever wrote them. Rotating away from version 1 therefore means keeping
// the version-1 key in DATA_ENCRYPTION_KEYS_PREVIOUS until the sweep in
// db/rotate-encryption-key.ts reports zero rows left on it, not deleting it.
const LEGACY_ENVELOPE_RE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/;
const VERSIONED_ENVELOPE_RE = /^v([0-9]{1,3}):([0-9a-f]{24}):([0-9a-f]{32}):([0-9a-f]*)$/;
const UNVERSIONED_KEY_VERSION = 1;

interface Envelope {
  version: number;
  iv: string;
  tag: string;
  ciphertext: string;
}

function parseEnvelope(stored: string): Envelope | null {
  const versioned = VERSIONED_ENVELOPE_RE.exec(stored);
  if (versioned) {
    // Every group is non-optional in the pattern, so all four matched.
    const [, version, iv, tag, ciphertext] = versioned as string[] as [string, string, string, string, string];
    return { version: Number(version), iv, tag, ciphertext };
  }
  if (LEGACY_ENVELOPE_RE.test(stored)) {
    const [iv, tag, ciphertext] = stored.split(':') as [string, string, string];
    return { version: UNVERSIONED_KEY_VERSION, iv, tag, ciphertext };
  }
  return null;
}

/** Whether a stored value has a ciphertext envelope shape, either one. Used by
 *  the 0048 backfill to skip rows that are already encrypted (re-running is
 *  safe) and by the rotation sweep to skip rows it does not own. */
export function isEncrypted(stored: string): boolean {
  return parseEnvelope(stored) !== null;
}

/** Which key version wrote this value, or null if it is not an envelope at
 *  all. The rotation sweep uses it to find rows still on a superseded key. */
export function envelopeKeyVersion(stored: string): number | null {
  return parseEnvelope(stored)?.version ?? null;
}

/** True for an envelope written by a key that is no longer the writing key.
 *  Non-envelope (legacy plaintext) values are the 0048 backfill's problem, not
 *  rotation's, so they answer false. */
export function needsReencryption(stored: string): boolean {
  const version = envelopeKeyVersion(stored);
  return version !== null && version !== config.DATA_ENCRYPTION_KEY_VERSION;
}

// Decrypt keys by version, built once per process. config.ts has already
// checked every key's shape and rejected a keyring that redefines the writing
// version, so this cannot fail here.
let cachedKeyring: Map<number, Buffer> | null = null;

function keyring(): Map<number, Buffer> {
  if (cachedKeyring) return cachedKeyring;
  const keys = new Map<number, Buffer>();
  if (config.DATA_ENCRYPTION_KEY) {
    keys.set(config.DATA_ENCRYPTION_KEY_VERSION, Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex'));
  }
  for (const entry of config.DATA_ENCRYPTION_KEYS_PREVIOUS.split(',').filter(Boolean)) {
    const [version, hex] = entry.split(':') as [string, string];
    keys.set(Number(version), Buffer.from(hex, 'hex'));
  }
  cachedKeyring = keys;
  return keys;
}

function activeKey(): Buffer | null {
  return keyring().get(config.DATA_ENCRYPTION_KEY_VERSION) ?? null;
}

// Warn once per process per reason. These are conditions an operator has to
// see and then fix, not per-row noise, and a per-row line would also be a
// standing invitation to log the row.
const warned = new Set<string>();

function warnOnce(reason: string, message: string): void {
  if (warned.has(reason)) return;
  warned.add(reason);
  process.emitWarning(message, 'CoinyEncryptionWarning');
}

// The no-op write path (1.3.5). It used to be the implicit consequence of an
// empty key outside production; now config.ts refuses to load unless someone
// asked for it by name, and reaching it still says so out loud.
function writePlaintext(value: string, caller: string): string {
  if (!config.ALLOW_PLAINTEXT_FIELDS) {
    throw new Error(`${caller} called without DATA_ENCRYPTION_KEY and without ALLOW_PLAINTEXT_FIELDS`);
  }
  warnOnce(
    'plaintext-write',
    'ALLOW_PLAINTEXT_FIELDS is set and DATA_ENCRYPTION_KEY is empty: PII and credentials are being stored unencrypted',
  );
  return value;
}

// Count of tolerated pre-0048 plaintext reads (1.3.4). The tolerance is real
// but it has an end state, and without a number nobody can tell whether the
// backfill finished. Never records the value: .claude/rules/security.md #2.
let legacyPlaintextReads = 0;

/** How many stored values this process has read that were not ciphertext.
 *  Zero across a deployment is the signal that ALLOW_LEGACY_PLAINTEXT_READS
 *  can be turned off. */
export function legacyPlaintextReadCount(): number {
  return legacyPlaintextReads;
}

/** Test-only: forget the cached keyring, the once-per-process warnings and the
 *  legacy read counter, so a test can re-read a changed config. */
export function _resetCryptoState(): void {
  cachedKeyring = null;
  warned.clear();
  legacyPlaintextReads = 0;
}

// The pre-0048 read path (1.3.4). Rows written before their column was
// encrypted are plaintext and have to stay readable, but tolerating any
// non-envelope value by default means a row written during a key-unset window
// is readable forever and indistinguishable from one that was never encrypted.
// So the tolerance is a named flag with an off switch, it is counted, and it
// announces itself once.
function readLegacyPlaintext(stored: string): string {
  if (!config.ALLOW_LEGACY_PLAINTEXT_READS) {
    throw new Error('decryptString: stored value is not a ciphertext envelope and ALLOW_LEGACY_PLAINTEXT_READS is off');
  }
  legacyPlaintextReads += 1;
  warnOnce(
    'legacy-plaintext-read',
    'read a stored value that is not a ciphertext envelope: pre-0048 plaintext rows remain, run scripts/backfill-encrypt-pii.ts',
  );
  return stored;
}

export function encryptString(plaintext: string): string {
  const key = activeKey();
  if (key === null) return writePlaintext(plaintext, 'encryptString');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const version = config.DATA_ENCRYPTION_KEY_VERSION;
  return `v${version}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptString(stored: string): string {
  const envelope = parseEnvelope(stored);
  if (envelope === null) return readLegacyPlaintext(stored);
  const key = keyring().get(envelope.version);
  if (key === undefined) {
    // Loud on purpose. The old code returned the ciphertext string as if it
    // were plaintext when no key was configured, which handed callers a value
    // that looked like data.
    throw new Error(`decryptString: no key configured for envelope version ${envelope.version}`);
  }
  // nosemgrep: javascript.node-crypto.security.gcm-no-tag-length — authTagLength option is the Node.js equivalent
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'hex'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
  return decipher.update(Buffer.from(envelope.ciphertext, 'hex')).toString('utf8') + decipher.final('utf8');
}

// Null-passing wrappers for nullable PII columns (transactions.merchant_name,
// plaid_recurring_streams.merchant_name). Same keyring, same envelope, same
// opt-in plaintext path and legacy-plaintext tolerance as the string versions.
export function encryptNullable(plaintext: string | null): string | null {
  return plaintext === null ? null : encryptString(plaintext);
}

export function decryptNullable(stored: string | null): string | null {
  return stored === null ? null : decryptString(stored);
}

// The blind index gets its own key, derived from the master with HKDF-SHA256
// rather than being a second secret to manage (1.3.3). Why derive rather than
// reuse: CipherSweet's security model gives every index a separately derived
// key so that compromise of one does not yield the other, and here the "other"
// is the AES key that decrypts every token in the database. Why HKDF rather
// than a bare hash: RFC 5869's expand step exists precisely to spread one
// secret across labelled purposes, the label makes the purpose auditable, and
// it is deterministic, so the index stays stable across processes and deploys.
// The label carries a version so a future index scheme can coexist with this
// one the same way the envelope versions do.
const BLIND_INDEX_INFO = 'coiny/blind-index/merchant/v1';
const BLIND_INDEX_SALT = Buffer.alloc(0);

function blindIndexKey(master: Buffer): Buffer {
  return Buffer.from(hkdfSync('sha256', master, BLIND_INDEX_SALT, BLIND_INDEX_INFO, 32));
}

/**
 * Deterministic keyed index (HMAC-SHA256, hex) for columns that must support
 * SQL equality lookups but must not store plaintext; category_overrides
 * .merchant_name is keyed on this. Deterministic on purpose: the same
 * normalized merchant always maps to the same index so upserts and lookups
 * work, at the accepted cost of revealing which override rows share a
 * merchant (nothing more, since the HMAC is not reversible without the key).
 *
 * Mirrors encryptString's posture: with no key and ALLOW_PLAINTEXT_FIELDS set
 * the value passes through unchanged, and without either the call throws.
 */
export function blindIndex(value: string): string {
  const key = activeKey();
  if (key === null) return writePlaintext(value, 'blindIndex');
  return createHmac('sha256', blindIndexKey(key)).update(value, 'utf8').digest('hex');
}

/**
 * The blind index as it was computed before the key was separated: HMAC keyed
 * on the master AES key itself. Read-only. Rows written under it are still in
 * the database, so lookups match both forms (store/overrides.ts) until the
 * rotation sweep has rewritten them; nothing writes this.
 */
export function blindIndexLegacy(value: string): string {
  const key = activeKey();
  if (key === null) return value;
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}
