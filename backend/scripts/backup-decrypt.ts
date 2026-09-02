// Decrypts a backup written by backup-encrypt.ts, to stdout (R-20.1, G1.27).
//
//   security find-generic-password -s coiny-backup-private-key -w \
//     | BACKUP_PRIVATE_KEY="$(cat)" tsx scripts/backup-decrypt.ts \
//         /tmp/coiny-2026-09-02.dump.enc > /tmp/coiny.dump
//   pg_restore --clean --if-exists --no-owner -d "$TARGET_URL" /tmp/coiny.dump
//
// This script exists as part of the backup, not as a convenience. An encrypted
// dump nobody has ever decrypted is not a backup, it is a file, and the day it
// is needed is the worst possible day to find that out. `pnpm test` runs the
// round trip on every commit for the same reason.

import { createReadStream } from 'node:fs';
import { decryptBackup } from '../src/backup/envelope.js';

async function main(): Promise<void> {
  const [inPath] = process.argv.slice(2);
  if (!inPath) throw new Error('usage: backup-decrypt.ts <backup-path> > out.dump');

  const privateKeyPem = process.env.BACKUP_PRIVATE_KEY;
  if (!privateKeyPem) throw new Error('BACKUP_PRIVATE_KEY is not set');

  const header = await decryptBackup({
    input: createReadStream(inPath),
    output: process.stdout,
    privateKeyPem,
    ...(process.env.BACKUP_PRIVATE_KEY_PASSPHRASE ? { passphrase: process.env.BACKUP_PRIVATE_KEY_PASSPHRASE } : {}),
  });

  // stderr, so redirecting stdout to the dump file keeps the dump clean.
  console.error(`decrypted ${header.label}, taken ${header.createdAt}`);
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    console.error('backup-decrypt failed:', err instanceof Error ? err.message : 'unknown error');
    process.exit(1);
  },
);
