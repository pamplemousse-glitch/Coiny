// The backup envelope round trip (R-20.1, G1.27).
//
// These tests are the reason the decrypt half exists in the repository at all.
// An encrypted dump nobody has ever decrypted is a file, not a backup, and the
// day it is needed is the worst possible day to discover which one it was.

import { generateKeyPairSync } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup } from '../src/backup/envelope.js';

/** 2048 rather than the 4096 the runbook tells the founder to generate: key
 *  generation is the slowest thing in this file, and the format does not vary
 *  by modulus size. The minimum itself is asserted separately. */
function keypair(modulusLength = 2048): { publicKey: string; privateKey: string } {
  const pair = generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

function collector(): { stream: Writable; bytes: () => Buffer } {
  const chunks: Buffer[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.from(chunk));
      cb();
    },
  });
  return { stream, bytes: () => Buffer.concat(chunks) };
}

async function encrypt(plaintext: Buffer, publicKey: string, label = 'test'): Promise<Buffer> {
  const out = collector();
  await encryptBackup({ input: Readable.from([plaintext]), output: out.stream, publicKeyPem: publicKey, label });
  return out.bytes();
}

async function decrypt(ciphertext: Buffer, privateKey: string): Promise<Buffer> {
  const out = collector();
  await decryptBackup({ input: Readable.from([ciphertext]), output: out.stream, privateKeyPem: privateKey });
  return out.bytes();
}

describe('backup envelope', () => {
  it('round-trips a dump', async () => {
    const keys = keypair();
    const plaintext = Buffer.from('PGDMP fake custom-format dump body\n'.repeat(500));

    const encrypted = await encrypt(plaintext, keys.publicKey);
    const decrypted = await decrypt(encrypted, keys.privateKey);

    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('round-trips across many chunks', async () => {
    // A real dump arrives as a stream of chunks, and the tag lives in the last
    // 16 bytes of the last one. A single-chunk test would not exercise the
    // hold-back at all.
    const keys = keypair();
    const chunks = Array.from({ length: 40 }, (_, i) => Buffer.from(`row ${i} `.repeat(200)));
    const out = collector();
    await encryptBackup({
      input: Readable.from(chunks),
      output: out.stream,
      publicKeyPem: keys.publicKey,
      label: 'chunked',
    });

    const decrypted = await decrypt(out.bytes(), keys.privateKey);
    expect(decrypted.equals(Buffer.concat(chunks))).toBe(true);
  });

  it('never writes the plaintext into the file', async () => {
    const keys = keypair();
    const secret = 'access-token-that-must-not-appear';
    const encrypted = await encrypt(Buffer.from(`${secret}\n`.repeat(100)), keys.publicKey);

    expect(encrypted.includes(secret)).toBe(false);
  });

  it('compresses, so a dump does not cost its own size in artifact storage', async () => {
    const keys = keypair();
    const repetitive = Buffer.from('a'.repeat(200_000));
    const encrypted = await encrypt(repetitive, keys.publicKey);

    expect(encrypted.length).toBeLessThan(repetitive.length / 10);
  });

  it('records the label and a timestamp in a readable header', async () => {
    const keys = keypair();
    const encrypted = await encrypt(Buffer.from('body'), keys.publicKey, 'production 2026-09-02');
    const headerLine = encrypted.subarray(0, encrypted.indexOf(0x0a)).toString('utf8');
    const header = JSON.parse(headerLine);

    // Readable without the key on purpose: an operator has to be able to tell
    // which file is which without decrypting all of them.
    expect(header.magic).toBe('coiny-backup');
    expect(header.label).toBe('production 2026-09-02');
    expect(header.alg).toBe('AES-256-GCM');
    expect(Date.parse(header.createdAt)).not.toBeNaN();
  });

  it('refuses the wrong private key with a message that says so', async () => {
    const encrypted = await encrypt(Buffer.from('body'), keypair().publicKey);
    const other = keypair();

    await expect(decrypt(encrypted, other.privateKey)).rejects.toThrow(/wrong backup private key/);
  });

  it('refuses a flipped bit in the ciphertext', async () => {
    const keys = keypair();
    const encrypted = await encrypt(Buffer.from('x'.repeat(5000)), keys.publicKey);
    const tampered = Buffer.from(encrypted);
    // Well past the header line, comfortably inside the body.
    const at = tampered.length - 100;
    tampered.writeUInt8(tampered.readUInt8(at) ^ 0x01, at);

    await expect(decrypt(tampered, keys.privateKey)).rejects.toThrow();
  });

  it('refuses an edited header, because the header is authenticated', async () => {
    const keys = keypair();
    const encrypted = await encrypt(Buffer.from('body'), keys.publicKey, 'production');
    const newlineAt = encrypted.indexOf(0x0a);
    const header = JSON.parse(encrypted.subarray(0, newlineAt).toString('utf8'));
    header.label = 'staging';
    const edited = Buffer.concat([Buffer.from(`${JSON.stringify(header)}\n`), encrypted.subarray(newlineAt + 1)]);

    // Relabelling a backup is the benign version; swapping the wrapped key is
    // not. Both are the same edit as far as the tag is concerned.
    await expect(decrypt(edited, keys.privateKey)).rejects.toThrow();
  });

  it('refuses a truncated file', async () => {
    const keys = keypair();
    const encrypted = await encrypt(Buffer.from('y'.repeat(5000)), keys.publicKey);

    // A partial upload is the realistic failure, and it is precisely the case
    // where a "best effort" decrypt would hand back a plausible prefix.
    await expect(decrypt(encrypted.subarray(0, encrypted.length - 32), keys.privateKey)).rejects.toThrow();
  });

  it('refuses a file that is not a backup', async () => {
    const keys = keypair();
    const notOurs = Buffer.concat([Buffer.from('{"hello":"world"}\n'), gzipSync(Buffer.from('body'))]);

    await expect(decrypt(notOurs, keys.privateKey)).rejects.toThrow(/not a Coiny backup/);
  });

  it('refuses an RSA key below the minimum modulus', async () => {
    const weak = keypair(1024);

    await expect(encrypt(Buffer.from('body'), weak.publicKey)).rejects.toThrow(/2048 is the minimum/);
  });

  it('refuses a non-RSA key rather than failing later', async () => {
    const ed = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    await expect(encrypt(Buffer.from('body'), ed.publicKey)).rejects.toThrow(/must be RSA/);
  });

  it('uses a different data key per dump', async () => {
    // Two dumps of identical content must not produce identical files: a
    // reused data key plus a reused iv is the one way to lose GCM outright.
    const keys = keypair();
    const a = await encrypt(Buffer.from('same body'), keys.publicKey);
    const b = await encrypt(Buffer.from('same body'), keys.publicKey);

    expect(a.equals(b)).toBe(false);
  });
});
