import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { petState, users } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { trackServerEvent } from './analytics.js';
import { forgetAppStoreIdentifiers } from './entitlements.js';
import { clearUserEvents } from './events.js';

export type UserRow = typeof users.$inferSelect;

export type FindOrCreateUserArgs =
  | { appleSub: string; googleSub?: never; email?: string | null; displayName?: string | null }
  | { appleSub?: never; googleSub: string; email?: string | null; displayName?: string | null };

export async function findOrCreateUser(args: FindOrCreateUserArgs): Promise<string> {
  const lookupColumn = args.appleSub ? users.appleSub : users.googleSub;
  const sub = (args.appleSub ?? args.googleSub) as string;

  const existing = await db().select({ id: users.id }).from(users).where(eq(lookupColumn, sub));
  if (existing[0]) return existing[0].id;

  const id = randomUUID();
  await db().transaction(async (tx) => {
    const encryptedEmail = args.email ? encryptString(args.email) : null;
    await tx.insert(users).values({
      id,
      appleSub: args.appleSub ?? null,
      googleSub: args.googleSub ?? null,
      email: encryptedEmail,
      displayName: args.displayName ?? null,
    });
    // Every user gets exactly one pet row, initialized with defaults.
    await tx.insert(petState).values({ userId: id });
  });

  // Cohort day 0 for every retention metric (prd.md R-2.1). Emitted only on
  // creation, never on a returning sign-in, and only after the transaction
  // committed. Method only: never the sub, never the email.
  await trackServerEvent(id, 'signup_completed', { method: args.appleSub ? 'apple' : 'google' });

  return id;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  await db().update(users).set({ displayName }).where(eq(users.id, userId));
}

// The Sign in with Apple refresh token, stored encrypted so that account
// deletion has something to hand Apple's `/auth/revoke` (TN3194). Written
// best-effort at sign-in: a failed exchange must never fail a sign-in, so the
// caller swallows the error and the user simply has no stored token, which
// revocation reports as `no_token` rather than as a failure.
export async function setAppleRefreshToken(userId: string, refreshToken: string): Promise<void> {
  await db()
    .update(users)
    .set({ appleRefreshToken: encryptString(refreshToken) })
    .where(eq(users.id, userId));
}

/** The Apple grant we hold for a user, decrypted. `appleSub` being null means
 *  this is a Google-only account and there is no Apple grant to revoke. */
export async function getAppleGrant(userId: string): Promise<{ appleSub: string | null; refreshToken: string | null }> {
  const rows = await db()
    .select({ appleSub: users.appleSub, appleRefreshToken: users.appleRefreshToken })
    .from(users)
    .where(eq(users.id, userId));

  const row = rows[0];
  if (!row) return { appleSub: null, refreshToken: null };
  return {
    appleSub: row.appleSub,
    refreshToken: row.appleRefreshToken ? decryptString(row.appleRefreshToken) : null,
  };
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await db().select().from(users).where(eq(users.id, id));
  const row = rows[0];
  if (!row) return null;
  // The Apple refresh token is deliberately dropped rather than decrypted: it
  // is a credential, it has exactly one reader (revoke/upstream.ts, via
  // getAppleGrant), and this is the generic accessor whose result is the one
  // most likely to end up in a response body one day.
  return { ...row, appleRefreshToken: null, email: row.email ? decryptString(row.email) : null };
}

// Deletes the user row (R-15.5). All child tables (sessions, pet_state,
// plaid_items, transactions, reaction_history, device_tokens,
// category_overrides) cascade off the user foreign key.
//
// Two tables carry no user foreign key and so cannot cascade, and both hold
// something that identifies the person after the account is gone. They are
// handled here rather than at the route so that every deletion path gets them:
//
//   processed_events: Plaid transaction ids, keyed by the id itself because
//     webhooks are deduplicated before any user lookup. Cleared first, because
//     the ids are resolved through `transactions`, which the cascade is about
//     to destroy.
//   app_store_notifications: Apple's stable per-subscriber identifier. The
//     ledger row itself must survive (it is what makes a redelivered
//     notification idempotent), so only the identifier is nulled.
//
// Both run before the delete and neither throws on an empty result, so a user
// with no subscription and no synced transactions costs two no-op statements.
export async function deleteUser(id: string): Promise<void> {
  await clearUserEvents(id);
  await forgetAppStoreIdentifiers(id);
  await db().delete(users).where(eq(users.id, id));
}
