// CLI entry for the encryption key rotation sweep. Loads env the same way the
// server does, connects, runs migrations, then re-encrypts every row still on
// a superseded key. Prints counts only — never row content.
//
// Before running, DATA_ENCRYPTION_KEY must hold the NEW key,
// DATA_ENCRYPTION_KEY_VERSION must be bumped, and the outgoing key must be
// listed in DATA_ENCRYPTION_KEYS_PREVIOUS under the version it wrote. The full
// procedure is at the top of src/db/rotate-encryption-key.ts.
//
//   source bin/load-secrets.sh && pnpm --filter coiny-backend exec tsx scripts/rotate-encryption-key.ts

import { initDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { rotateEncryptionKey } from '../src/db/rotate-encryption-key.js';

async function main(): Promise<void> {
  await initDb();
  await runMigrations();
  const counts = await rotateEncryptionKey();
  console.log('rotate-encryption-key complete:', JSON.stringify(counts));
  if (counts.legacyPlaintextSkipped > 0) {
    console.log(
      `rotate-encryption-key: ${counts.legacyPlaintextSkipped} pre-0048 plaintext values skipped; run scripts/backfill-encrypt-pii.ts`,
    );
  }
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    // Counts and error class only; a thrown DB or crypto error message could
    // quote row content, so print the name and stop there.
    console.error('rotate-encryption-key failed:', err instanceof Error ? err.name : 'unknown error');
    process.exit(1);
  },
);
