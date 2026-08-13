// One-shot backfill for migration 0048: re-encrypts merchant PII rows that
// were written before the encrypt-at-write paths landed.
//
// This lives in application code, not in the 0048 SQL migration, because the
// AES key never reaches Postgres: SQL cannot produce the ciphertext. It is
// safe to defer and safe to re-run — every read path tolerates plaintext rows
// (decryptString passes non-envelope values through, overrides match both key
// forms), so there is no window where reads fail, and already-encrypted rows
// are recognised by their envelope shape and skipped.
//
// Run via: pnpm --filter coiny-backend exec tsx scripts/backfill-encrypt-pii.ts
//
// Never logs a merchant name, an amount, or any other row content: callers
// get counts only (.claude/rules/security.md #2).

import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { categoryOverrides, plaidRecurringStreams, transactions } from '../db/schema.js';
import { blindIndex, encryptString, isEncrypted } from '../util/crypto.js';
import { db } from './client.js';

export interface BackfillCounts {
  transactionsEncrypted: number;
  streamMerchantsEncrypted: number;
  streamDescriptionsEncrypted: number;
  overridesRewritten: number;
}

export async function backfillEncryptPii(): Promise<BackfillCounts> {
  const counts: BackfillCounts = {
    transactionsEncrypted: 0,
    streamMerchantsEncrypted: 0,
    streamDescriptionsEncrypted: 0,
    overridesRewritten: 0,
  };

  // transactions.merchant_name: plaintext -> ciphertext, keyed by PK.
  const txRows = await db()
    .select({ transactionId: transactions.transactionId, merchantName: transactions.merchantName })
    .from(transactions)
    .where(isNotNull(transactions.merchantName));
  for (const row of txRows) {
    if (row.merchantName === null || isEncrypted(row.merchantName)) continue;
    await db()
      .update(transactions)
      .set({ merchantName: encryptString(row.merchantName) })
      .where(eq(transactions.transactionId, row.transactionId));
    counts.transactionsEncrypted += 1;
  }

  // plaid_recurring_streams: merchant_name and description, keyed by PK.
  const streamRows = await db()
    .select({
      streamId: plaidRecurringStreams.streamId,
      merchantName: plaidRecurringStreams.merchantName,
      description: plaidRecurringStreams.description,
    })
    .from(plaidRecurringStreams);
  for (const row of streamRows) {
    const set: { merchantName?: string; description?: string } = {};
    if (row.merchantName !== null && !isEncrypted(row.merchantName)) {
      set.merchantName = encryptString(row.merchantName);
      counts.streamMerchantsEncrypted += 1;
    }
    if (!isEncrypted(row.description)) {
      set.description = encryptString(row.description);
      counts.streamDescriptionsEncrypted += 1;
    }
    if (Object.keys(set).length > 0) {
      await db().update(plaidRecurringStreams).set(set).where(eq(plaidRecurringStreams.streamId, row.streamId));
    }
  }

  // category_overrides: legacy rows (merchant_name_enc null) hold the
  // plaintext normalized merchant in the PK column. Rewrite to the blind
  // index + encrypted display copy. The PK (user_id, merchant_name) changes
  // value, so this is a delete + insert; setOverride cannot have created a
  // competing blind-index row without deleting the legacy one first, so the
  // insert cannot conflict.
  const overrideRows = await db().select().from(categoryOverrides).where(isNull(categoryOverrides.merchantNameEnc));
  for (const row of overrideRows) {
    const idx = blindIndex(row.merchantName);
    if (idx === row.merchantName) continue; // no key configured: nothing to rewrite
    await db()
      .delete(categoryOverrides)
      .where(and(eq(categoryOverrides.userId, row.userId), eq(categoryOverrides.merchantName, row.merchantName)));
    await db()
      .insert(categoryOverrides)
      .values({
        userId: row.userId,
        merchantName: idx,
        merchantNameEnc: encryptString(row.merchantName),
        category: row.category,
        createdAt: row.createdAt,
      })
      .onConflictDoNothing();
    counts.overridesRewritten += 1;
  }

  return counts;
}
