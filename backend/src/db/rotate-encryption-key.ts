// Key rotation sweep: rewrites every stored envelope that a superseded key
// wrote so it is encrypted under the current DATA_ENCRYPTION_KEY_VERSION.
//
// This is the tooling half of the rotation path. The other half is the version
// tag in the envelope (util/crypto.ts): without it, "rotate the key" means
// every stored token becomes garbage and every user relinks everything, which
// is a thing you do not want to discover during an incident.
//
// The procedure, in order:
//   1. Put the outgoing key in DATA_ENCRYPTION_KEYS_PREVIOUS under the version
//      it currently writes (version 1 if it predates versioning).
//   2. Put the new key in DATA_ENCRYPTION_KEY and bump
//      DATA_ENCRYPTION_KEY_VERSION.
//   3. Deploy. New writes are on the new key; old rows still read, because the
//      outgoing key is still in the keyring.
//   4. Run this sweep. It is safe to re-run and safe to interrupt: every row
//      is rewritten independently and rows already on the current version are
//      skipped.
//   5. When it reports zero rewrites, drop the outgoing key from
//      DATA_ENCRYPTION_KEYS_PREVIOUS.
//
// Run via: pnpm --filter coiny-backend exec tsx scripts/rotate-encryption-key.ts
//
// Never logs a token, a merchant name or any other row content: callers get
// counts only (.claude/rules/security.md #2).

import { and, eq, getTableColumns, getTableName } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
  alpacaConnections,
  categoryOverrides,
  coinbaseConnections,
  discogsConnections,
  discogsPending,
  kalshiConnections,
  krakenConnections,
  plaidItems,
  plaidRecurringStreams,
  plaidRemovalQueue,
  reactionHistory,
  transactions,
  truelayerConnections,
  users,
  ynabConnections,
} from '../db/schema.js';
import { blindIndex, decryptString, encryptString, isEncrypted, needsReencryption } from '../util/crypto.js';
import { db } from './client.js';

interface RotationTarget {
  name: string;
  table: PgTable;
  pk: string;
  columns: string[];
}

// Typed at the call site so a renamed column fails the build rather than the
// sweep. The values are Drizzle property names, not SQL column names.
function target<T extends PgTable>(
  table: T,
  pk: keyof T['_']['columns'] & string,
  columns: (keyof T['_']['columns'] & string)[],
): RotationTarget {
  return { name: getTableName(table), table, pk, columns };
}

// Every column any call site passes through encryptString, except
// category_overrides, which is handled separately below because rotating it
// changes its primary key.
const TARGETS: RotationTarget[] = [
  target(users, 'id', ['email']),
  target(reactionHistory, 'id', ['reaction']),
  target(plaidItems, 'itemId', ['accessToken']),
  // Usually empty, and it is the row you can least afford to lose to a
  // rotation: an unreadable token here means an Item that keeps billing with
  // no way left to cancel it, which is the exact leak the queue closes.
  target(plaidRemovalQueue, 'itemId', ['accessToken']),
  target(transactions, 'transactionId', ['merchantName']),
  target(plaidRecurringStreams, 'streamId', ['merchantName', 'description']),
  target(coinbaseConnections, 'userId', ['accessToken', 'refreshToken']),
  target(ynabConnections, 'userId', ['apiKey', 'accessToken', 'refreshToken']),
  target(krakenConnections, 'userId', ['apiKey', 'privateKey']),
  target(discogsConnections, 'userId', ['accessToken', 'accessTokenSecret']),
  target(discogsPending, 'userId', ['oauthTokenSecret']),
  target(kalshiConnections, 'userId', ['privateKeyBase64']),
  target(alpacaConnections, 'userId', ['apiKeyId', 'apiSecretKey']),
  target(truelayerConnections, 'id', ['accessToken', 'refreshToken']),
];

export interface RotationCounts {
  /** Rows written, across all tables. */
  rowsRewritten: number;
  /** Individual encrypted values re-encrypted. */
  valuesRewritten: number;
  /** Values skipped because they are pre-0048 plaintext, which is the
   *  backfill's job (scripts/backfill-encrypt-pii.ts), not rotation's. */
  legacyPlaintextSkipped: number;
  /** Rows written per table, for the operator to sanity-check against row
   *  counts they already know. */
  byTable: Record<string, number>;
}

function emptyCounts(): RotationCounts {
  return { rowsRewritten: 0, valuesRewritten: 0, legacyPlaintextSkipped: 0, byTable: {} };
}

export async function rotateEncryptionKey(): Promise<RotationCounts> {
  const counts = emptyCounts();
  for (const spec of TARGETS) {
    await rotateTable(spec, counts);
  }
  await rotateCategoryOverrides(counts);
  return counts;
}

async function rotateTable(spec: RotationTarget, counts: RotationCounts): Promise<void> {
  const tableColumns = getTableColumns(spec.table) as Record<string, PgColumn>;
  const pkColumn = tableColumns[spec.pk] as PgColumn;
  const projection: Record<string, PgColumn> = { __pk: pkColumn };
  for (const key of spec.columns) {
    projection[key] = tableColumns[key] as PgColumn;
  }

  const rows = await db().select(projection).from(spec.table);
  for (const row of rows) {
    const patch: Record<string, string> = {};
    for (const key of spec.columns) {
      const value = row[key];
      if (typeof value !== 'string') continue; // null column
      if (!isEncrypted(value)) {
        counts.legacyPlaintextSkipped += 1;
        continue;
      }
      if (!needsReencryption(value)) continue;
      patch[key] = encryptString(decryptString(value));
    }
    if (Object.keys(patch).length === 0) continue;
    // The loop is generic over tables by construction, so the patch is a plain
    // record; Drizzle types .set() per table and cannot see that.
    // biome-ignore lint/suspicious/noExplicitAny: update patch is generic over tables
    const setValues = patch as any;
    await db().update(spec.table).set(setValues).where(eq(pkColumn, row.__pk));
    counts.rowsRewritten += 1;
    counts.valuesRewritten += Object.keys(patch).length;
    counts.byTable[spec.name] = (counts.byTable[spec.name] ?? 0) + 1;
  }
}

// category_overrides carries two key-dependent values: the encrypted display
// copy and the blind index, which is half the primary key. Rotating the AES
// key changes the derived index key with it (util/crypto.ts), so the row moves
// rather than being updated in place: delete, re-insert under the new index.
// Rows whose merchant_name_enc is null are pre-0048 plaintext and belong to the
// backfill, not here.
async function rotateCategoryOverrides(counts: RotationCounts): Promise<void> {
  const name = getTableName(categoryOverrides);
  const rows = await db().select().from(categoryOverrides);
  for (const row of rows) {
    if (row.merchantNameEnc === null) {
      counts.legacyPlaintextSkipped += 1;
      continue;
    }
    const merchant = decryptString(row.merchantNameEnc);
    const idx = blindIndex(merchant);
    // A mismatched index covers both cases that need moving: an index keyed on
    // the AES key itself, and an index derived from a superseded key.
    if (!needsReencryption(row.merchantNameEnc) && row.merchantName === idx) continue;

    await db()
      .delete(categoryOverrides)
      .where(and(eq(categoryOverrides.userId, row.userId), eq(categoryOverrides.merchantName, row.merchantName)));
    await db()
      .insert(categoryOverrides)
      .values({
        userId: row.userId,
        merchantName: idx,
        merchantNameEnc: encryptString(merchant),
        category: row.category,
        createdAt: row.createdAt,
      })
      .onConflictDoUpdate({
        target: [categoryOverrides.userId, categoryOverrides.merchantName],
        set: { merchantNameEnc: encryptString(merchant), category: row.category },
      });
    counts.rowsRewritten += 1;
    counts.valuesRewritten += 1;
    counts.byTable[name] = (counts.byTable[name] ?? 0) + 1;
  }
}
