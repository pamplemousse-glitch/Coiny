// Deploy-time migration entrypoint. Invoked by fly.toml `release_command`,
// which runs once per release, before any new machine takes traffic.
//
// This exists because migrating on boot is wrong in two ways that only appear
// under load: every machine that starts races every other machine to migrate,
// and a release whose migration fails still serves requests against a schema it
// does not match. As a release command, a non-zero exit aborts the deploy and
// the previous version keeps serving.
//
// Exit codes matter here: Fly treats non-zero as a failed release.
import { config } from '../config.js';
import { log } from '../util/log.js';
import { initDb } from './client.js';
import { runMigrations } from './migrate.js';

async function main(): Promise<void> {
  if (!config.DATABASE_URL) {
    log.error('migrate: DATABASE_URL is not set, refusing to run');
    process.exit(1);
  }

  // Environment name only. Never the connection string: it carries the password
  // and release command output is retained in Fly's logs.
  log.info(`migrate: starting for app_env=${config.APP_ENV}`);

  await initDb();
  await runMigrations();

  log.info('migrate: complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    log.error('migrate: FAILED', err instanceof Error ? err.message : err);
    // Non-zero aborts the Fly release, so a schema change that cannot apply
    // never gets a running app pointed at it.
    process.exit(1);
  });
