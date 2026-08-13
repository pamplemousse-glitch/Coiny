// CLI entry for the 0048 PII backfill. Loads env the same way the server
// does (DATA_ENCRYPTION_KEY must be set or the run is a no-op outside
// production), connects, runs migrations, then re-encrypts legacy plaintext
// rows. Prints counts only — never row content.
//
//   source bin/load-secrets.sh && pnpm --filter coiny-backend exec tsx scripts/backfill-encrypt-pii.ts

import { initDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { backfillEncryptPii } from '../src/db/backfill-encrypt-pii.js';

async function main(): Promise<void> {
  await initDb();
  await runMigrations();
  const counts = await backfillEncryptPii();
  console.log('backfill-encrypt-pii complete:', JSON.stringify(counts));
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    // Counts and error class only; a thrown DB error message could quote row
    // content, so print the name and stop there.
    console.error('backfill-encrypt-pii failed:', err instanceof Error ? err.name : 'unknown error');
    process.exit(1);
  },
);
