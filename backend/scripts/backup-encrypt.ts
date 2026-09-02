// Encrypts a database dump read from stdin (R-20.1, G1.27).
//
//   pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges \
//     | tsx scripts/backup-encrypt.ts /tmp/coiny-2026-09-02.dump.enc "production"
//
// Reads the public key from BACKUP_PUBLIC_KEY (a PEM, newlines and all). The
// private half never appears here and never appears in CI: see
// docs/backup-runbook.md for generating the pair and where each half lives.
//
// Streams stdin straight through gzip and AES-256-GCM, so the dump is never
// buffered and never lands on disk in the clear. The nightly job runs on a
// GitHub runner whose disk is not ours.

import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { encryptBackup } from '../src/backup/envelope.js';

async function main(): Promise<void> {
  const [outPath, label] = process.argv.slice(2);
  if (!outPath) throw new Error('usage: backup-encrypt.ts <out-path> [label]');

  const publicKeyPem = process.env.BACKUP_PUBLIC_KEY;
  if (!publicKeyPem) throw new Error('BACKUP_PUBLIC_KEY is not set');

  const output = createWriteStream(outPath, { mode: 0o600 });
  const header = await encryptBackup({
    input: process.stdin,
    output,
    publicKeyPem,
    label: label ?? 'unlabelled',
  });
  output.end();
  await once(output, 'finish');

  // Header fields only: no sizes that could hint at row counts is overthinking
  // it, but no connection string, no key material, and no row content is not.
  console.log(JSON.stringify({ path: outPath, createdAt: header.createdAt, label: header.label }));
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    // Error class and message: these come from our own throws or from
    // node:crypto, never from a database row.
    console.error('backup-encrypt failed:', err instanceof Error ? err.message : 'unknown error');
    process.exit(1);
  },
);
