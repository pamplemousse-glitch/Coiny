// Restore rehearsal harness (G1.26, closing 4.12.5 to 4.12.7 and 4.12.10).
//
// Neon's restore is not a copy-back: it builds a new point-in-time branch, moves
// the compute onto it so the connection string does not change, and renames the
// old head to `{branch}_old_{timestamp}`. So this script does not perform the
// restore. It captures what was true before and checks the same things after,
// which is the part a console cannot do for you.
//
//   # BEFORE restoring, against the branch you are about to restore:
//   source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
//     tsx scripts/verify-restore.ts baseline > /tmp/restore-baseline.json
//
//   # ... restore the branch in the Neon console, noting the wall clock ...
//
//   # AFTER:
//   source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
//     tsx scripts/verify-restore.ts verify /tmp/restore-baseline.json
//
// Prints table names, row counts and pass/fail only. Never row content: a
// restore drill is not a reason to relax .claude/rules/security.md #2.

import { readFileSync } from 'node:fs';
import type { SQL } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db, initDb } from '../src/db/client.js';
import { decryptString } from '../src/util/crypto.js';

/** `DB` is `PgDatabase<PgQueryResultHKT, ...>`, and with the result HKT left
 *  generic `execute()` returns `unknown` rather than rows. The concrete driver
 *  here is always postgres-js, which resolves to an array of row objects, so
 *  the cast is asserting the driver this script actually runs against. It never
 *  runs under PGlite, whose shape differs. */
async function query<T>(statement: SQL): Promise<T[]> {
  return (await db().execute(statement)) as unknown as T[];
}

/** Row counts drift between capture and restore for legitimate reasons: the
 *  scheduler ticks, a webhook lands. R-20.2 sets the tolerance at 5%. */
const TOLERANCE = 0.05;

interface Baseline {
  capturedAt: string;
  counts: Record<string, number>;
  latestNetWorthDate: string | null;
  /** Pseudonymous. Named in security.md #2 as safe to log. */
  sampleItemId: string | null;
}

/** Counts every table in `public` rather than a hardcoded list, so a migration
 *  that adds a table does not quietly fall outside the drill. */
async function tableCounts(): Promise<Record<string, number>> {
  const tables = await query<{ table_name: string }>(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const counts: Record<string, number> = {};
  for (const { table_name } of tables) {
    // table_name comes from information_schema, not from user input, and is
    // interpolated as an identifier rather than a value.
    // count(*) is cast to text because a bigint arrives as a string from some
    // drivers and a number from others; Number() then handles exactly one shape.
    const result = await query<{ n: string }>(sql`SELECT count(*)::text AS n FROM ${sql.identifier(table_name)}`);
    counts[table_name] = Number(result[0]?.n ?? 0);
  }
  return counts;
}

async function latestNetWorthDate(): Promise<string | null> {
  const rows = await query<{ d: string | null }>(sql`SELECT max(date)::text AS d FROM net_worth_daily`);
  return rows[0]?.d ?? null;
}

async function sampleItemId(): Promise<string | null> {
  const rows = await query<{ item_id: string }>(sql`SELECT item_id FROM plaid_items ORDER BY item_id LIMIT 1`);
  return rows[0]?.item_id ?? null;
}

async function capture(): Promise<Baseline> {
  return {
    capturedAt: new Date().toISOString(),
    counts: await tableCounts(),
    latestNetWorthDate: await latestNetWorthDate(),
    sampleItemId: await sampleItemId(),
  };
}

/** The assertion that a restore actually recovered something usable.
 *
 *  A database restored without its DATA_ENCRYPTION_KEY looks completely healthy
 *  by row count and completely worthless in fact: every stored Plaid token is
 *  ciphertext nobody can read, and every user re-links every account. This is
 *  the check that tells those two states apart, which is why it is not
 *  optional. See docs/restore-runbook.md. */
async function tokenDecrypts(itemId: string): Promise<boolean> {
  const rows = await query<{ access_token: string }>(
    sql`SELECT access_token FROM plaid_items WHERE item_id = ${itemId}`,
  );
  const stored = rows[0]?.access_token;
  if (!stored) return false;
  try {
    const plaintext = decryptString(stored);
    // Non-empty, and actually transformed. A plaintext-fallback read would
    // return the stored value unchanged and must not count as a pass.
    return plaintext.length > 0 && plaintext !== stored;
  } catch {
    return false;
  }
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function verify(baselinePath: string): Promise<boolean> {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
  const counts = await tableCounts();
  let ok = true;

  console.log(`baseline captured at ${baseline.capturedAt}`);
  console.log(`tolerance ${TOLERANCE * 100}%\n`);

  const missing = Object.keys(baseline.counts).filter((t) => !(t in counts));
  for (const table of missing) {
    console.log(`FAIL  ${table}: table absent after restore`);
    ok = false;
  }

  for (const [table, before] of Object.entries(baseline.counts)) {
    if (!(table in counts)) continue;
    const after = counts[table] ?? 0;
    // An empty table that is still empty is a pass, not a division by zero.
    const drift = before === 0 ? (after === 0 ? 0 : 1) : Math.abs(after - before) / before;
    const verdict = drift <= TOLERANCE ? 'ok  ' : 'FAIL';
    if (drift > TOLERANCE) ok = false;
    console.log(`${verdict}  ${table}: ${before} -> ${after} (${(drift * 100).toFixed(1)}%)`);
  }

  const added = Object.keys(counts).filter((t) => !(t in baseline.counts));
  for (const table of added) {
    console.log(`note  ${table}: present after restore, absent from baseline`);
  }

  const latest = await latestNetWorthDate();
  const expected = yesterdayUTC();
  if (latest === expected) {
    console.log(`\nok    net_worth_daily latest date is ${latest}`);
  } else {
    console.log(`\nFAIL  net_worth_daily latest date is ${latest}, expected ${expected}`);
    ok = false;
  }

  if (baseline.sampleItemId) {
    const decrypts = await tokenDecrypts(baseline.sampleItemId);
    if (decrypts) {
      console.log(`ok    access_token for item ${baseline.sampleItemId} decrypts`);
    } else {
      console.log(`FAIL  access_token for item ${baseline.sampleItemId} does NOT decrypt`);
      console.log('      The database is restored and the data is unreadable. Check');
      console.log('      DATA_ENCRYPTION_KEY and DATA_ENCRYPTION_KEYS_PREVIOUS before');
      console.log('      concluding anything about the restore itself.');
      ok = false;
    }
  } else {
    console.log('note  no plaid_items row in the baseline, so the decrypt check did not run');
  }

  return ok;
}

async function main(): Promise<void> {
  const [mode, arg] = process.argv.slice(2);
  await initDb();

  if (mode === 'baseline') {
    console.log(JSON.stringify(await capture(), null, 2));
    return;
  }

  if (mode === 'verify') {
    if (!arg) throw new Error('verify needs a path to the baseline JSON');
    const ok = await verify(arg);
    if (!ok) process.exit(1);
    return;
  }

  throw new Error('usage: verify-restore.ts baseline | verify <baseline.json>');
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    // Error class only. A thrown database error can quote row content.
    console.error('verify-restore failed:', err instanceof Error ? err.name : 'unknown error');
    process.exit(1);
  },
);
