import { randomUUID } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';
import { type Tier, type TransactionPayload, tierForProductId } from '../appstore/types.js';
import { db } from '../db/client.js';
import { entitlements, householdMembers, plaidItems } from '../db/schema.js';

// Server-side subscription authority (docs/prd.md §25). The client never
// decides whether a user has paid: rows here are written only from verified
// Apple signed data (client-reported transaction JWS or App Store Server
// Notifications V2), and every read resolves against the clock.

export type EntitlementStatus = 'none' | 'active' | 'grace' | 'billing_retry' | 'expired' | 'revoked';

export type EntitlementRow = typeof entitlements.$inferSelect;

export interface ResolvedEntitlement {
  tier: Tier;
  status: EntitlementStatus;
  entitledUntil: Date | null;
  // 'own' when the user's own subscription grants the tier, 'household' when
  // inherited from a household owner's subscription, null when free.
  source: 'own' | 'household' | null;
}

export const FREE_ENTITLEMENT: ResolvedEntitlement = {
  tier: 'free',
  status: 'none',
  entitledUntil: null,
  source: null,
};

// Household covers up to 5 people INCLUDING the purchaser (§25.1), so at most
// 4 member rows per owner.
export const HOUSEHOLD_MAX_MEMBERS = 5;

// --- Tier limits (§25.1, DR-2 / DR-20) -------------------------------------

export interface TierLimits {
  // null means unlimited.
  liveConnections: number | null;
  activeGoals: number | null;
  guardrails: number | null;
  historyDays: number | null;
}

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { liveConnections: 2, activeGoals: 1, guardrails: 2, historyDays: 30 },
  individual: { liveConnections: 12, activeGoals: 3, guardrails: null, historyDays: 730 },
  household: { liveConnections: null, activeGoals: 3, guardrails: null, historyDays: null },
};

export function limitsForTier(tier: Tier): TierLimits {
  return TIER_LIMITS[tier];
}

// --- Pure resolution --------------------------------------------------------

/** Whether a stored entitlement row grants its paid tier at `now`. Pure so the
 *  grace/billing-retry/refund matrix is unit-testable without a database. */
export function resolveEntitlement(row: EntitlementRow | null | undefined, now: Date): ResolvedEntitlement {
  if (!row) return FREE_ENTITLEMENT;

  const status = row.status as EntitlementStatus;
  const tier = row.tier as Tier;
  if (tier === 'free' || status === 'none' || status === 'revoked' || status === 'expired') {
    return { ...FREE_ENTITLEMENT, status };
  }

  // Grace period extends entitlement past expiry while Apple retries billing
  // with the user notified. Plain billing retry does not: access lapses at
  // expiry and comes back via DID_RENEW if the retry succeeds.
  const entitledUntil =
    status === 'grace' && row.graceExpiresAt && (!row.expiresAt || row.graceExpiresAt > row.expiresAt)
      ? row.graceExpiresAt
      : row.expiresAt;

  if (!entitledUntil || now >= entitledUntil) {
    return { ...FREE_ENTITLEMENT, status };
  }
  return { tier, status, entitledUntil, source: 'own' };
}

// --- Row access, always scoped by userId ------------------------------------

export async function getEntitlementRow(userId: string): Promise<EntitlementRow | null> {
  const [row] = await db().select().from(entitlements).where(eq(entitlements.userId, userId));
  return row ?? null;
}

/** Gets the user's entitlement row, creating the free-tier row (and minting
 *  the appAccountToken the client passes to StoreKit) on first access. */
export async function ensureEntitlementRow(userId: string): Promise<EntitlementRow> {
  const existing = await getEntitlementRow(userId);
  if (existing) return existing;
  const [inserted] = await db()
    .insert(entitlements)
    .values({ userId, appAccountToken: randomUUID() })
    .onConflictDoNothing({ target: entitlements.userId })
    .returning();
  // A concurrent request may have inserted first; fall back to reading.
  return inserted ?? ((await getEntitlementRow(userId)) as EntitlementRow);
}

export async function findByOriginalTransactionId(originalTransactionId: string): Promise<EntitlementRow | null> {
  const [row] = await db()
    .select()
    .from(entitlements)
    .where(eq(entitlements.originalTransactionId, originalTransactionId));
  return row ?? null;
}

export async function findByAppAccountToken(appAccountToken: string): Promise<EntitlementRow | null> {
  const [row] = await db().select().from(entitlements).where(eq(entitlements.appAccountToken, appAccountToken));
  return row ?? null;
}

function toDate(msSinceEpoch: number | undefined): Date | null {
  return typeof msSinceEpoch === 'number' ? new Date(msSinceEpoch) : null;
}

/** Applies a VERIFIED Apple transaction to a user's entitlement row. Caller is
 *  responsible for having checked the JWS signature, the bundle id, and that
 *  the originalTransactionId is not bound to a different user. */
export async function applyTransaction(userId: string, tx: TransactionPayload): Promise<EntitlementRow> {
  await ensureEntitlementRow(userId);

  const tier = tierForProductId(tx.productId);
  const expiresAt = toDate(tx.expiresDate);
  const revokedAt = toDate(tx.revocationDate);
  const now = new Date();

  let status: EntitlementStatus;
  if (revokedAt) status = 'revoked';
  else if (expiresAt && expiresAt <= now) status = 'expired';
  else status = 'active';

  const patch = {
    tier: (tier ?? 'free') as string,
    status: status as string,
    productId: tx.productId,
    originalTransactionId: tx.originalTransactionId,
    environment: tx.environment,
    expiresAt,
    graceExpiresAt: null,
    revokedAt,
    updatedAt: now,
  };
  const [updated] = await db().update(entitlements).set(patch).where(eq(entitlements.userId, userId)).returning();
  return updated as EntitlementRow;
}

export type EntitlementPatch = Partial<
  Pick<
    EntitlementRow,
    'tier' | 'status' | 'productId' | 'environment' | 'expiresAt' | 'graceExpiresAt' | 'autoRenew' | 'revokedAt'
  >
>;

export async function updateEntitlement(userId: string, patch: EntitlementPatch): Promise<void> {
  await db()
    .update(entitlements)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(entitlements.userId, userId));
}

// --- Effective entitlement (own or household-inherited) ---------------------

export async function getEffectiveEntitlement(userId: string, now: Date = new Date()): Promise<ResolvedEntitlement> {
  const own = resolveEntitlement(await getEntitlementRow(userId), now);
  if (own.tier !== 'free') return own;

  // A member inherits ONLY the household tier from their household's owner;
  // an owner's individual subscription grants members nothing.
  const [membership] = await db().select().from(householdMembers).where(eq(householdMembers.memberUserId, userId));
  if (!membership) return own;

  const ownerResolved = resolveEntitlement(await getEntitlementRow(membership.ownerUserId), now);
  if (ownerResolved.tier !== 'household') return own;
  return { ...ownerResolved, source: 'household' };
}

// --- Household membership ----------------------------------------------------
// Model only: the invite/consent flow is deliberately not exposed over HTTP
// until the two-party consent flow exists (obligations §2, BLOCKER for the
// household tier).

export type AddMemberResult =
  | { ok: true }
  | { ok: false; reason: 'owner_not_household' | 'household_full' | 'already_in_household' | 'self' };

export async function addHouseholdMember(
  ownerUserId: string,
  memberUserId: string,
  now: Date = new Date(),
): Promise<AddMemberResult> {
  if (ownerUserId === memberUserId) return { ok: false, reason: 'self' };

  const owner = resolveEntitlement(await getEntitlementRow(ownerUserId), now);
  if (owner.tier !== 'household' || owner.source !== 'own') {
    return { ok: false, reason: 'owner_not_household' };
  }

  const [{ existing } = { existing: 0 }] = await db()
    .select({ existing: count() })
    .from(householdMembers)
    .where(eq(householdMembers.ownerUserId, ownerUserId));
  if (existing >= HOUSEHOLD_MAX_MEMBERS - 1) return { ok: false, reason: 'household_full' };

  const [inserted] = await db()
    .insert(householdMembers)
    .values({ ownerUserId, memberUserId })
    .onConflictDoNothing({ target: householdMembers.memberUserId })
    .returning();
  if (!inserted) return { ok: false, reason: 'already_in_household' };
  return { ok: true };
}

export async function removeHouseholdMember(ownerUserId: string, memberUserId: string): Promise<void> {
  await db()
    .delete(householdMembers)
    .where(and(eq(householdMembers.ownerUserId, ownerUserId), eq(householdMembers.memberUserId, memberUserId)));
}

export async function listHouseholdMemberIds(ownerUserId: string): Promise<string[]> {
  const rows = await db()
    .select({ memberUserId: householdMembers.memberUserId })
    .from(householdMembers)
    .where(eq(householdMembers.ownerUserId, ownerUserId));
  return rows.map((r) => r.memberUserId);
}

// --- The gate (R-25.6): live connections ------------------------------------
// "Live authenticated connections" counts aggregator connections, which are
// the cost driver the pricing metric mirrors (R-25.1). At US launch that is
// Plaid items that are not disabled. TrueLayer (UK) joins this count when the
// UK beachhead ships; derived and declared assets are never counted.

export async function countLiveConnections(userId: string): Promise<number> {
  const [{ n } = { n: 0 }] = await db()
    .select({ n: count() })
    .from(plaidItems)
    .where(and(eq(plaidItems.userId, userId), eq(plaidItems.disabled, false)));
  return n;
}

export type ConnectionGateResult = { ok: true } | { ok: false; tier: Tier; limit: number; current: number };

export async function canAddConnection(userId: string, now: Date = new Date()): Promise<ConnectionGateResult> {
  const resolved = await getEffectiveEntitlement(userId, now);
  const limit = limitsForTier(resolved.tier).liveConnections;
  if (limit === null) return { ok: true };
  const current = await countLiveConnections(userId);
  if (current < limit) return { ok: true };
  return { ok: false, tier: resolved.tier, limit, current };
}
