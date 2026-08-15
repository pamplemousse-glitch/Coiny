// Applies every migration from an empty PGlite database, in journal order,
// and reports which ones the migrator actually ran. The journal bug is silent
// by nature: a skipped entry produces no error, just a missing table.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const client = new PGlite();
const db = drizzle(client);
await migrate(db, { migrationsFolder: './drizzle' });

const { rows } = await client.query(`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`);
const names = rows.map((r) => r.table_name);
const expected = [
  'analytics_events',      // 0039
  'plaid_account_balances', // 0040
  'asset_class_cache',      // 0040
  'goal_pace',              // 0042
  'debt_accounts',          // 0044
  'entitlements',           // 0045
];
console.log('tables:', names.length);
for (const t of expected) console.log((names.includes(t) ? 'OK   ' : 'MISS ') + t);
const { rows: cols } = await client.query(
  `select column_name from information_schema.columns where table_name='device_tokens' and column_name='timezone'`,
);
console.log((cols.length ? 'OK   ' : 'MISS ') + 'device_tokens.timezone (0043)');
const { rows: st } = await client.query(
  `select column_name from information_schema.columns where table_name='plaid_items' and column_name='status'`,
);
console.log((st.length ? 'OK   ' : 'MISS ') + 'plaid_items.status (0041)');
await client.close();
