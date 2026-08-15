import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';

// Drizzle decides what to apply by comparing each journal entry's `when` against
// the newest timestamp already in __drizzle_migrations. An entry at or below
// that watermark is SILENTLY SKIPPED: no error, no warning, just a table that
// never appears in production.
//
// This has bitten four times. Twice in production in June (0005_multi_user and
// 0007_external_integrations never applied; 0008_apply_missing_schema exists to
// patch up what was lost), and twice more during the August integration work,
// caught before deploy.
//
// Every time, a fresh-database test passed, because on an empty database the
// watermark starts at zero and everything applies in order. The bug only exists
// when migrations land on a database that already has history, which is the
// only case that matters.
//
// These tests reproduce that case.

const drizzleFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');

type JournalEntry = { idx: number; when: number; tag: string; version: string; breakpoints: boolean };

function readJournal(): JournalEntry[] {
  return JSON.parse(readFileSync(join(drizzleFolder, 'meta', '_journal.json'), 'utf8')).entries;
}

/** Applies a subset of the journal, so a test can simulate "production is at tag X". */
async function migrateUpTo(client: PGlite, upToTag: string): Promise<void> {
  const entries = readJournal();
  const cutoff = entries.findIndex((e) => e.tag === upToTag);
  if (cutoff === -1) throw new Error(`no journal entry tagged ${upToTag}`);

  await client.exec('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.exec(`CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
    id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
  )`);

  for (const entry of entries.slice(0, cutoff + 1)) {
    const sql = readFileSync(join(drizzleFolder, `${entry.tag}.sql`), 'utf8');
    // Drizzle splits on this marker; PGlite's exec runs multiple statements.
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) await client.exec(statement);
    }
    await client.query('INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)', [
      entry.tag,
      entry.when,
    ]);
  }
}

describe('migration journal ordering', () => {
  // Drizzle compares against the MAXIMUM timestamp already applied, not the
  // previous entry, so this is the rule that actually matters.
  //
  // Baselined at index 8 because 0005_multi_user and 0007_external_integrations
  // are genuinely out of order and were genuinely skipped in production: the
  // live database has 37 of the first 38 journal entries, missing exactly those
  // two, plus one orphan row that is not in the journal at all. The schema
  // survived only because 0008_apply_missing_schema was written afterwards to
  // patch up what had been lost, which is what that file's name is recording.
  //
  // Those entries cannot be rewritten now (they are history in every database
  // that has one), so they are the baseline rather than a failure.
  const HISTORICAL_ANOMALY_BASELINE = 8;

  it('no entry is at or below the high-water mark of every entry before it', () => {
    const entries = readJournal();
    let watermark = Math.max(...entries.slice(0, HISTORICAL_ANOMALY_BASELINE).map((e) => e.when));

    const wouldBeSkipped: string[] = [];
    for (const entry of entries.slice(HISTORICAL_ANOMALY_BASELINE)) {
      if (entry.when <= watermark) {
        wouldBeSkipped.push(`${entry.tag} (when=${entry.when}) is at or below the watermark ${watermark}`);
      }
      watermark = Math.max(watermark, entry.when);
    }

    expect(wouldBeSkipped).toEqual([]);
  });

  it('the two known historical skips are still the only ones', () => {
    const entries = readJournal();
    const anomalies = entries
      .slice(0, HISTORICAL_ANOMALY_BASELINE)
      .filter((entry, i, arr) => i > 0 && entry.when <= Math.max(...arr.slice(0, i).map((e) => e.when)))
      .map((e) => e.tag);

    // If this ever changes, the baseline above is wrong and the comment lies.
    expect(anomalies).toEqual(['0005_multi_user', '0007_external_integrations']);
  });

  it('journal order matches migration file numbering', () => {
    const tags = readJournal().map((e) => e.tag);
    const numbers = tags.map((t) => Number(t.slice(0, 4)));
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });
});

describe('migrating onto a database that already has history', () => {
  // Production sits at 0037_drop_snaptrade (verified against the live Neon
  // branch on 2026-08-14). Everything from 0038 onward is pending, so this is
  // the exact upgrade the next deploy performs.
  const PRODUCTION_TAG = '0037_drop_snaptrade';

  it('applies every pending migration rather than silently skipping one', async () => {
    const client = new PGlite();
    await migrateUpTo(client, PRODUCTION_TAG);

    const before = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM drizzle."__drizzle_migrations"');
    const appliedBefore = before.rows[0]?.n ?? 0;

    await migrate(drizzle(client) as never, { migrationsFolder: drizzleFolder });

    const after = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM drizzle."__drizzle_migrations"');
    const appliedAfter = after.rows[0]?.n ?? 0;

    // The count must reach the full journal. A skipped entry shows up here as a
    // shortfall, which is the failure mode that produces no error of its own.
    expect(appliedAfter).toBe(readJournal().length);
    expect(appliedAfter).toBeGreaterThan(appliedBefore);

    await client.close();
  });

  it('creates the tables the pending migrations are supposed to create', async () => {
    const client = new PGlite();
    await migrateUpTo(client, PRODUCTION_TAG);
    await migrate(drizzle(client) as never, { migrationsFolder: drizzleFolder });

    // One table per migration that introduces one, so a skip is named rather
    // than showing up as an off-by-one in a count.
    const expected = [
      'analytics_events', // 0039
      'plaid_account_balances', // 0040
      'asset_class_cache', // 0040
      'goal_pace', // 0042
      'debt_accounts', // 0044
      'entitlements', // 0045
      'declared_assets', // 0046
    ];

    const found = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = new Set(found.rows.map((r) => r.table_name));
    expect(expected.filter((t) => !names.has(t))).toEqual([]);

    // And the columns added to existing tables, which a dropped ALTER would miss.
    const columns = await client.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND ((table_name = 'device_tokens' AND column_name = 'timezone')
           OR (table_name = 'plaid_items' AND column_name IN ('status', 'institution_name')))`,
    );
    expect(columns.rows).toHaveLength(3);

    await client.close();
  });

  it('is idempotent: a second run applies nothing and does not fail', async () => {
    const client = new PGlite();
    await migrateUpTo(client, PRODUCTION_TAG);
    await migrate(drizzle(client) as never, { migrationsFolder: drizzleFolder });

    const first = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM drizzle."__drizzle_migrations"');
    await migrate(drizzle(client) as never, { migrationsFolder: drizzleFolder });
    const second = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM drizzle."__drizzle_migrations"');

    expect(second.rows[0]?.n).toBe(first.rows[0]?.n);

    await client.close();
  });
});
