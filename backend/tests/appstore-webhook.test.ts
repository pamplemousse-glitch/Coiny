import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setTrustedRootsForTesting } from '../src/appstore/roots.js';
import { PRODUCT_IDS } from '../src/appstore/types.js';
import {
  applyTransaction,
  ensureEntitlementRow,
  getEffectiveEntitlement,
  getEntitlementRow,
} from '../src/store/entitlements.js';
import {
  generateChain,
  renewalInfoPayload,
  signedNotification,
  signJws,
  type TestChain,
  transactionPayload,
} from './appstore-helper.js';
import { resetDatabase, testUserId } from './db-helper.js';

let chain: TestChain;
let untrustedChain: TestChain;

beforeAll(() => {
  chain = generateChain();
  untrustedChain = generateChain();
  setTrustedRootsForTesting(chain.roots);
});

afterAll(() => {
  setTrustedRootsForTesting(null);
});

async function makeApp() {
  const { buildApp } = await import('../src/server.js');
  return buildApp();
}

function post(app: Awaited<ReturnType<typeof makeApp>>, signedPayload: string) {
  return app.inject({ method: 'POST', url: '/webhooks/appstore', payload: { signedPayload } });
}

/** Seeds the test user with an active individual subscription bound to
 *  originalTransactionId orig_tx_1, the id the payload builders default to. */
async function seedActiveSubscription(): Promise<void> {
  await applyTransaction(testUserId, {
    transactionId: 't_seed',
    originalTransactionId: 'orig_tx_1',
    productId: PRODUCT_IDS.individualAnnual,
    bundleId: 'app.coiny.test',
    environment: 'Sandbox',
    expiresDate: Date.now() + 30 * 86_400_000,
  });
}

describe('POST /webhooks/appstore', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('rejects a payload signed by an untrusted chain', async () => {
    const app = await makeApp();
    const res = await post(app, signedNotification(untrustedChain, { type: 'SUBSCRIBED' }));
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('rejects a notification for a different bundle id', async () => {
    const app = await makeApp();
    const envelope = {
      notificationType: 'SUBSCRIBED',
      notificationUUID: 'uuid-bundle-mismatch',
      data: { bundleId: 'com.other.app' },
    };
    const res = await post(app, signJws(envelope, chain));
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('activates an entitlement when SUBSCRIBED matches the appAccountToken', async () => {
    const app = await makeApp();
    const { appAccountToken } = await ensureEntitlementRow(testUserId);

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'SUBSCRIBED',
        subtype: 'INITIAL_BUY',
        transaction: transactionPayload({ appAccountToken, originalTransactionId: 'orig_sub_1' }),
        renewal: renewalInfoPayload({ originalTransactionId: 'orig_sub_1' }),
      }),
    );
    expect(res.statusCode).toBe(200);

    const effective = await getEffectiveEntitlement(testUserId);
    expect(effective.tier).toBe('individual');
    expect(effective.status).toBe('active');
    await app.close();
  });

  it('extends the expiry on DID_RENEW', async () => {
    const app = await makeApp();
    await seedActiveSubscription();
    const newExpiry = Date.now() + 395 * 86_400_000;

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'DID_RENEW',
        transaction: transactionPayload({ expiresDate: newExpiry }),
        renewal: renewalInfoPayload(),
      }),
    );
    expect(res.statusCode).toBe(200);

    const row = await getEntitlementRow(testUserId);
    expect(row?.expiresAt?.getTime()).toBe(newExpiry);
    expect(row?.status).toBe('active');
    await app.close();
  });

  it('keeps the user entitled through a grace period after a failed renewal', async () => {
    const app = await makeApp();
    await seedActiveSubscription();
    const expired = Date.now() - 86_400_000;
    const graceEnd = Date.now() + 15 * 86_400_000;

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'DID_FAIL_TO_RENEW',
        subtype: 'GRACE_PERIOD',
        transaction: transactionPayload({ expiresDate: expired }),
        renewal: renewalInfoPayload({ gracePeriodExpiresDate: graceEnd, isInBillingRetryPeriod: true }),
      }),
    );
    expect(res.statusCode).toBe(200);

    const effective = await getEffectiveEntitlement(testUserId);
    expect(effective.tier).toBe('individual');
    expect(effective.status).toBe('grace');
    expect(effective.entitledUntil?.getTime()).toBe(graceEnd);
    await app.close();
  });

  it('degrades to free at expiry when billing retry has no grace period', async () => {
    const app = await makeApp();
    await seedActiveSubscription();

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'DID_FAIL_TO_RENEW',
        transaction: transactionPayload({ expiresDate: Date.now() - 86_400_000 }),
        renewal: renewalInfoPayload({ isInBillingRetryPeriod: true }),
      }),
    );
    expect(res.statusCode).toBe(200);

    const effective = await getEffectiveEntitlement(testUserId);
    expect(effective.tier).toBe('free');
    expect(effective.status).toBe('billing_retry');
    await app.close();
  });

  it('restores entitlement when a successful retry lands as DID_RENEW', async () => {
    const app = await makeApp();
    await seedActiveSubscription();

    await post(
      app,
      signedNotification(chain, {
        type: 'DID_FAIL_TO_RENEW',
        transaction: transactionPayload({ expiresDate: Date.now() - 86_400_000 }),
      }),
    );
    expect((await getEffectiveEntitlement(testUserId)).tier).toBe('free');

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'DID_RENEW',
        subtype: 'BILLING_RECOVERY',
        transaction: transactionPayload({ expiresDate: Date.now() + 365 * 86_400_000 }),
        renewal: renewalInfoPayload(),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect((await getEffectiveEntitlement(testUserId)).tier).toBe('individual');
    await app.close();
  });

  it('revokes the entitlement immediately on REFUND', async () => {
    const app = await makeApp();
    await seedActiveSubscription();

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'REFUND',
        transaction: transactionPayload({
          expiresDate: Date.now() + 300 * 86_400_000,
          revocationDate: Date.now(),
          revocationReason: 0,
        }),
      }),
    );
    expect(res.statusCode).toBe(200);

    const effective = await getEffectiveEntitlement(testUserId);
    expect(effective.tier).toBe('free');
    expect(effective.status).toBe('revoked');
    expect((await getEntitlementRow(testUserId))?.revokedAt).not.toBeNull();
    await app.close();
  });

  it('marks the entitlement expired on EXPIRED', async () => {
    const app = await makeApp();
    await seedActiveSubscription();

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'EXPIRED',
        subtype: 'VOLUNTARY',
        transaction: transactionPayload({ expiresDate: Date.now() - 86_400_000 }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect((await getEffectiveEntitlement(testUserId)).status).toBe('expired');
    await app.close();
  });

  it('records auto-renew off without touching entitlement on DID_CHANGE_RENEWAL_STATUS', async () => {
    const app = await makeApp();
    await seedActiveSubscription();

    const res = await post(
      app,
      signedNotification(chain, {
        type: 'DID_CHANGE_RENEWAL_STATUS',
        subtype: 'AUTO_RENEW_DISABLED',
        transaction: transactionPayload(),
        renewal: renewalInfoPayload({ autoRenewStatus: 0 }),
      }),
    );
    expect(res.statusCode).toBe(200);

    const row = await getEntitlementRow(testUserId);
    expect(row?.autoRenew).toBe(false);
    expect((await getEffectiveEntitlement(testUserId)).tier).toBe('individual');
    await app.close();
  });

  it('processes a duplicate notificationUUID only once', async () => {
    const app = await makeApp();
    await seedActiveSubscription();
    const uuid = 'uuid-dup-1';
    const refund = signedNotification(chain, {
      type: 'REFUND',
      uuid,
      transaction: transactionPayload({ revocationDate: Date.now() }),
    });

    expect((await post(app, refund)).statusCode).toBe(200);

    // Re-subscribe, then replay the refund with the same UUID: state must not move.
    await seedActiveSubscription();
    expect((await post(app, refund)).statusCode).toBe(200);
    expect((await getEffectiveEntitlement(testUserId)).tier).toBe('individual');
    await app.close();
  });

  it('acknowledges a notification that matches no user without creating state', async () => {
    const app = await makeApp();
    const res = await post(
      app,
      signedNotification(chain, {
        type: 'SUBSCRIBED',
        transaction: transactionPayload({ originalTransactionId: 'orig_unknown', appAccountToken: undefined }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(await getEntitlementRow(testUserId)).toBeNull();
    await app.close();
  });

  it('acknowledges the TEST notification', async () => {
    const app = await makeApp();
    const res = await post(app, signedNotification(chain, { type: 'TEST', transaction: null }));
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
