import { beforeEach, describe, expect, it } from 'vitest';
import { PRODUCT_IDS } from '../src/appstore/types.js';
import {
  addHouseholdMember,
  applyTransaction,
  canAddConnection,
  type EntitlementRow,
  ensureEntitlementRow,
  getEffectiveEntitlement,
  limitsForTier,
  removeHouseholdMember,
  resolveEntitlement,
} from '../src/store/entitlements.js';
import { resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-13T12:00:00Z');
const FUTURE = new Date('2027-08-13T12:00:00Z');
const PAST = new Date('2026-08-01T12:00:00Z');

function row(overrides: Partial<EntitlementRow>): EntitlementRow {
  return {
    userId: 'u1',
    appAccountToken: 'token',
    tier: 'free',
    status: 'none',
    productId: null,
    originalTransactionId: null,
    environment: null,
    expiresAt: null,
    graceExpiresAt: null,
    autoRenew: false,
    revokedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('resolveEntitlement', () => {
  it('resolves a missing row to free', () => {
    expect(resolveEntitlement(null, NOW).tier).toBe('free');
  });

  it('resolves an active subscription before expiry to its tier', () => {
    const resolved = resolveEntitlement(row({ tier: 'individual', status: 'active', expiresAt: FUTURE }), NOW);
    expect(resolved).toEqual({ tier: 'individual', status: 'active', entitledUntil: FUTURE, source: 'own' });
  });

  it('resolves an active subscription past expiry to free', () => {
    const resolved = resolveEntitlement(row({ tier: 'individual', status: 'active', expiresAt: PAST }), NOW);
    expect(resolved.tier).toBe('free');
  });

  it('keeps entitlement through a billing grace period', () => {
    const resolved = resolveEntitlement(
      row({ tier: 'household', status: 'grace', expiresAt: PAST, graceExpiresAt: FUTURE }),
      NOW,
    );
    expect(resolved).toEqual({ tier: 'household', status: 'grace', entitledUntil: FUTURE, source: 'own' });
  });

  it('drops entitlement at expiry during plain billing retry', () => {
    const resolved = resolveEntitlement(row({ tier: 'individual', status: 'billing_retry', expiresAt: PAST }), NOW);
    expect(resolved.tier).toBe('free');
  });

  it('drops entitlement immediately on refund regardless of expiry', () => {
    const resolved = resolveEntitlement(
      row({ tier: 'individual', status: 'revoked', expiresAt: FUTURE, revokedAt: NOW }),
      NOW,
    );
    expect(resolved.tier).toBe('free');
  });
});

describe('tier limits', () => {
  it('matches the free tier boundary in prd section 25.1', () => {
    expect(limitsForTier('free')).toEqual({ liveConnections: 2, activeGoals: 1, guardrails: 2, historyDays: 30 });
  });

  it('gives the individual tier 12 connections and 2 years of history', () => {
    expect(limitsForTier('individual')).toEqual({
      liveConnections: 12,
      activeGoals: 3,
      guardrails: null,
      historyDays: 730,
    });
  });

  it('gives the household tier unlimited connections and history', () => {
    expect(limitsForTier('household')).toEqual({
      liveConnections: null,
      activeGoals: 3,
      guardrails: null,
      historyDays: null,
    });
  });
});

describe('entitlement rows', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('mints a stable appAccountToken on first access', async () => {
    const first = await ensureEntitlementRow(testUserId);
    const second = await ensureEntitlementRow(testUserId);
    expect(first.appAccountToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.appAccountToken).toBe(first.appAccountToken);
  });

  it('stores a verified transaction as an active entitlement', async () => {
    await applyTransaction(testUserId, {
      transactionId: 't1',
      originalTransactionId: 'orig_1',
      productId: PRODUCT_IDS.individualAnnual,
      bundleId: 'app.coiny.test',
      environment: 'Sandbox',
      expiresDate: Date.now() + 86_400_000,
    });
    const effective = await getEffectiveEntitlement(testUserId);
    expect(effective.tier).toBe('individual');
  });
});

describe('household membership', () => {
  let ownerId: string;
  let memberId: string;

  beforeEach(async () => {
    await resetDatabase();
    const { findOrCreateUser } = await import('../src/store/users.js');
    ownerId = await findOrCreateUser({ appleSub: 'owner_sub' });
    memberId = await findOrCreateUser({ appleSub: 'member_sub' });
  });

  async function subscribeHousehold(userId: string): Promise<void> {
    await applyTransaction(userId, {
      transactionId: `t_${userId}`,
      originalTransactionId: `orig_${userId}`,
      productId: PRODUCT_IDS.householdAnnual,
      bundleId: 'app.coiny.test',
      environment: 'Sandbox',
      expiresDate: Date.now() + 86_400_000,
    });
  }

  it('refuses members when the owner is not on the household tier', async () => {
    const result = await addHouseholdMember(ownerId, memberId);
    expect(result).toEqual({ ok: false, reason: 'owner_not_household' });
  });

  it('members inherit the household tier from the owner', async () => {
    await subscribeHousehold(ownerId);
    expect(await addHouseholdMember(ownerId, memberId)).toEqual({ ok: true });
    const effective = await getEffectiveEntitlement(memberId);
    expect(effective).toMatchObject({ tier: 'household', source: 'household' });
  });

  it('a member never inherits an individual subscription', async () => {
    await applyTransaction(ownerId, {
      transactionId: 't_ind',
      originalTransactionId: 'orig_ind',
      productId: PRODUCT_IDS.individualAnnual,
      bundleId: 'app.coiny.test',
      environment: 'Sandbox',
      expiresDate: Date.now() + 86_400_000,
    });
    expect(await addHouseholdMember(ownerId, memberId)).toEqual({ ok: false, reason: 'owner_not_household' });
  });

  it('caps the household at 5 people including the owner', async () => {
    await subscribeHousehold(ownerId);
    const { findOrCreateUser } = await import('../src/store/users.js');
    for (let i = 0; i < 4; i++) {
      const uid = await findOrCreateUser({ appleSub: `member_${i}` });
      expect(await addHouseholdMember(ownerId, uid)).toEqual({ ok: true });
    }
    const sixth = await findOrCreateUser({ appleSub: 'member_5' });
    expect(await addHouseholdMember(ownerId, sixth)).toEqual({ ok: false, reason: 'household_full' });
  });

  it('a user can belong to at most one household', async () => {
    await subscribeHousehold(ownerId);
    const { findOrCreateUser } = await import('../src/store/users.js');
    const secondOwner = await findOrCreateUser({ appleSub: 'owner2_sub' });
    await subscribeHousehold(secondOwner);

    expect(await addHouseholdMember(ownerId, memberId)).toEqual({ ok: true });
    expect(await addHouseholdMember(secondOwner, memberId)).toEqual({ ok: false, reason: 'already_in_household' });
  });

  it('an owner cannot add themselves', async () => {
    await subscribeHousehold(ownerId);
    expect(await addHouseholdMember(ownerId, ownerId)).toEqual({ ok: false, reason: 'self' });
  });

  it('removal is instant and returns the member to free', async () => {
    await subscribeHousehold(ownerId);
    await addHouseholdMember(ownerId, memberId);
    await removeHouseholdMember(ownerId, memberId);
    const effective = await getEffectiveEntitlement(memberId);
    expect(effective.tier).toBe('free');
  });
});

describe('the connection gate', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('blocks the third live connection on the free tier', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item_1', accessToken: 'a1', userId: testUserId });
    await upsertItem({ itemId: 'item_2', accessToken: 'a2', userId: testUserId });
    const gate = await canAddConnection(testUserId);
    expect(gate).toEqual({ ok: false, tier: 'free', limit: 2, current: 2 });
  });

  it('ignores disabled connections when counting', async () => {
    const { upsertItem, disableItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item_1', accessToken: 'a1', userId: testUserId });
    await upsertItem({ itemId: 'item_2', accessToken: 'a2', userId: testUserId });
    await disableItem('item_2');
    expect(await canAddConnection(testUserId)).toEqual({ ok: true });
  });

  it('lifts the limit to 12 on the individual tier', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item_1', accessToken: 'a1', userId: testUserId });
    await upsertItem({ itemId: 'item_2', accessToken: 'a2', userId: testUserId });
    await applyTransaction(testUserId, {
      transactionId: 't1',
      originalTransactionId: 'orig_1',
      productId: PRODUCT_IDS.individualAnnual,
      bundleId: 'app.coiny.test',
      environment: 'Sandbox',
      expiresDate: Date.now() + 86_400_000,
    });
    expect(await canAddConnection(testUserId)).toEqual({ ok: true });
  });
});
