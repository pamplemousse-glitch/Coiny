// The backup envelope: gzip, then AES-256-GCM under a per-dump data key, with
// that data key wrapped to an RSA public key (R-20.1, G1.27).
//
// Why asymmetric rather than a shared passphrase. The job that takes the dump
// runs in CI, unattended, on infrastructure the founder does not control end to
// end. A symmetric secret there means CI can read every backup it has ever
// taken, and anything that can read CI's secrets can too. With a public key in
// CI, a full compromise of the runner yields the ability to WRITE backups and
// nothing else: the private half never leaves the founder's Keychain.
//
// This is the same trade the encryption-at-rest key does not get to make (the
// server has to decrypt tokens to use them), which is exactly why the backup
// key must be a separate key, not `DATA_ENCRYPTION_KEY` reused. A backup
// encrypted with the key that a compromised server already holds protects
// against nothing that matters.
//
// Format, deliberately boring and self-describing:
//
//   <one line of JSON header>\n<gzip-then-AES-GCM ciphertext><16-byte GCM tag>
//
// The header line is fed to the cipher as additional authenticated data, so a
// backup whose header has been edited (a swapped wrapped key, a changed iv)
// fails the tag check instead of decrypting to something else. There is no
// plaintext checksum: the GCM tag IS the integrity check, and a second one
// invites the mistake of trusting it when the tag has not been verified yet.
//
// Node built-ins only, per .claude/rules/security.md #7.

import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  constants as cryptoConstants,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'node:crypto';
import type { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createGzip } from 'node:zlib';

const MAGIC = 'coiny-backup';
const FORMAT_VERSION = 1;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
/** RSA-OAEP-SHA256 wraps 32 bytes comfortably at 2048; 4096 is what the
 *  runbook tells the founder to generate. Below 2048 is refused rather than
 *  warned about, because a backup is written once and read years later, when
 *  nobody is reading warnings. */
const MIN_RSA_MODULUS_BITS = 2048;

export interface BackupHeader {
  magic: typeof MAGIC;
  v: number;
  /** Bulk cipher over the compressed dump. */
  alg: 'AES-256-GCM';
  /** How `key` is wrapped. */
  wrap: 'RSA-OAEP-SHA256';
  compression: 'gzip';
  /** The per-dump data key, wrapped to the backup public key. Base64. */
  key: string;
  iv: string;
  createdAt: string;
  /** What was dumped, for the operator reading a directory listing. Never a
   *  connection string: those carry a password. */
  label: string;
}

function assertUsableRsaKey(key: ReturnType<typeof createPublicKey>): void {
  const details = key.asymmetricKeyDetails;
  if (key.asymmetricKeyType !== 'rsa') {
    throw new Error(`backup key must be RSA, got ${key.asymmetricKeyType ?? 'unknown'}`);
  }
  const bits = details?.modulusLength ?? 0;
  if (bits < MIN_RSA_MODULUS_BITS) {
    throw new Error(`backup key is ${bits}-bit; ${MIN_RSA_MODULUS_BITS} is the minimum`);
  }
}

/**
 * Compresses and encrypts `input` into `output`.
 *
 * Streams throughout: a dump is not sized to fit in memory, and a backup script
 * that dies on a big database is a backup script that fails the first time it
 * matters. `output` is NOT ended here, because the tag is written after the
 * pipeline drains; the caller owns closing it.
 */
export async function encryptBackup(opts: {
  input: Readable;
  output: Writable;
  publicKeyPem: string;
  label: string;
  now?: Date;
}): Promise<BackupHeader> {
  const publicKey = createPublicKey(opts.publicKeyPem);
  assertUsableRsaKey(publicKey);

  const dataKey = randomBytes(KEY_BYTES);
  const iv = randomBytes(IV_BYTES);
  const wrapped = publicEncrypt(
    { key: publicKey, padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    dataKey,
  );

  const header: BackupHeader = {
    magic: MAGIC,
    v: FORMAT_VERSION,
    alg: 'AES-256-GCM',
    wrap: 'RSA-OAEP-SHA256',
    compression: 'gzip',
    key: wrapped.toString('base64'),
    iv: iv.toString('base64'),
    createdAt: (opts.now ?? new Date()).toISOString(),
    label: opts.label,
  };
  const headerLine = JSON.stringify(header);

  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  cipher.setAAD(Buffer.from(headerLine, 'utf8'));

  opts.output.write(`${headerLine}\n`);
  await pipeline(opts.input, createGzip(), cipher, opts.output, { end: false });
  opts.output.write(cipher.getAuthTag());

  return header;
}

/** Reads the header line off the front of a stream and hands back the rest of
 *  the bytes unconsumed. Splitting on the first newline is safe because
 *  `JSON.stringify` never emits a raw newline. */
async function readHeader(
  input: Readable,
): Promise<{ header: BackupHeader; headerLine: string; rest: AsyncIterable<Buffer> }> {
  const iterator = input[Symbol.asyncIterator]() as AsyncIterator<Buffer | string>;
  let buffered = Buffer.alloc(0);
  let newlineAt = -1;

  while (newlineAt === -1) {
    const next = await iterator.next();
    if (next.done) throw new Error('not a Coiny backup: no header line');
    buffered = Buffer.concat([buffered, Buffer.from(next.value)]);
    newlineAt = buffered.indexOf(0x0a);
    // A header this long is a file that is not one of ours; refuse rather than
    // buffer an arbitrary amount of it looking for a newline that never comes.
    if (newlineAt === -1 && buffered.length > 64 * 1024) {
      throw new Error('not a Coiny backup: header line too long');
    }
  }

  const headerLine = buffered.subarray(0, newlineAt).toString('utf8');
  const remainder = buffered.subarray(newlineAt + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(headerLine);
  } catch {
    throw new Error('not a Coiny backup: header is not JSON');
  }
  const header = parsed as BackupHeader;
  if (header?.magic !== MAGIC) throw new Error('not a Coiny backup: wrong magic');
  if (header.v !== FORMAT_VERSION) throw new Error(`unsupported backup format v${header.v}`);

  async function* rest(): AsyncGenerator<Buffer> {
    if (remainder.length > 0) yield remainder;
    while (true) {
      const next = await iterator.next();
      if (next.done) return;
      yield Buffer.from(next.value);
    }
  }

  // `headerLine` is returned as the exact bytes read, never re-serialized. It
  // is the AAD, so a round trip through JSON.stringify would make verification
  // depend on key order surviving a parse, which is not a property to bet a
  // restore on.
  return { header, headerLine, rest: rest() };
}

/**
 * Decrypts a backup written by `encryptBackup` into `output`.
 *
 * Throws if the tag does not verify, which covers a truncated file, a flipped
 * bit, an edited header, and a file encrypted to a different key. There is no
 * "best effort" mode: a backup that decrypts to something other than what was
 * dumped is worse than no backup, because it is restored with confidence.
 */
export async function decryptBackup(opts: {
  input: Readable;
  output: Writable;
  privateKeyPem: string;
  passphrase?: string;
}): Promise<BackupHeader> {
  const privateKey = createPrivateKey(
    opts.passphrase ? { key: opts.privateKeyPem, passphrase: opts.passphrase } : opts.privateKeyPem,
  );
  assertUsableRsaKey(createPublicKey(privateKey));

  const { header, headerLine, rest } = await readHeader(opts.input);

  let dataKey: Buffer;
  try {
    dataKey = privateDecrypt(
      { key: privateKey, padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from(header.key, 'base64'),
    );
  } catch {
    // The common real-world case, and worth its own sentence: this is the
    // wrong private key, not a corrupt file.
    throw new Error('cannot unwrap the data key: wrong backup private key');
  }

  const decipher = createDecipheriv('aes-256-gcm', dataKey, Buffer.from(header.iv, 'base64'));
  decipher.setAAD(Buffer.from(headerLine, 'utf8'));

  // The tag is the last 16 bytes of the file, so the ciphertext has to be held
  // back by that much until the stream ends. Setting it before the generator
  // returns means the decipher still has it in hand when `final()` runs.
  async function* withheldTag(source: AsyncIterable<Buffer>): AsyncGenerator<Buffer> {
    let tail = Buffer.alloc(0);
    for await (const chunk of source) {
      const buf = Buffer.concat([tail, chunk]);
      if (buf.length > TAG_BYTES) {
        yield buf.subarray(0, buf.length - TAG_BYTES);
        tail = buf.subarray(buf.length - TAG_BYTES);
      } else {
        tail = buf;
      }
    }
    if (tail.length !== TAG_BYTES) throw new Error('backup is truncated: no authentication tag');
    decipher.setAuthTag(tail);
  }

  await pipeline(rest, withheldTag, decipher, createGunzip(), opts.output);
  return header;
}
