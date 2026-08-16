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

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await db().select().from(users).where(eq(users.id, id));
  const row = rows[0];
  if (!row) return null;
  return { ...row, email: row.email ? decryptString(row.email) : null };
}

export type ConsentState = {
  legalAcceptedAt: Date | null;
  legalVersion: string | null;
  analyticsOptOut: boolean;
};

/** Reads the consent record so the client can restore the Settings toggle after
 *  a reinstall, and so support can answer "did this user ever see the notice".
 *  Returns null for an unknown user. */
export async function getConsent(userId: string): Promise<ConsentState | null> {
  const rows = await db()
    .select({
      legalAcceptedAt: users.legalAcceptedAt,
      legalVersion: users.legalVersion,
      analyticsOptOut: users.analyticsOptOut,
    })
    .from(users)
    .where(eq(users.id, userId));
  return rows[0] ?? null;
}

/** Records that the user acknowledged the Terms and the privacy notice, and
 *  which version they were shown. Reg P 1016.9(b)(1)(iii): the acknowledgement
 *  is the delivery, so what has to survive is the timestamp and the version.
 *  Overwrites any earlier acknowledgement; the current version is the one that
 *  binds, and a re-acknowledgement of the same version is a no-op in effect. */
export async function recordLegalAcceptance(userId: string, version: string, acceptedAt = new Date()): Promise<void> {
  await db().update(users).set({ legalAcceptedAt: acceptedAt, legalVersion: version }).where(eq(users.id, userId));
}

/** Flips the "Share usage data" toggle. Read on every analytics write by
 *  store/analytics.ts, so this one column stops the server-emitted trail too. */
export async function setAnalyticsOptOut(userId: string, optOut: boolean): Promise<void> {
  await db().update(users).set({ analyticsOptOut: optOut }).where(eq(users.id, userId));
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
