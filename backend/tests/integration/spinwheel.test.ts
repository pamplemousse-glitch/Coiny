/**
 * D2 — Spinwheel sandbox integration tests
 *
 * Requires:
 *   source bin/load-secrets.sh
 *   INTEGRATION_TEST=1 \
 *   SPINWHEEL_TEST_PHONE="+1XXXXXXXXXX" \   # from developer.spinwheel.io/docs/test-users
 *   pnpm --filter coiny-backend test backend/tests/integration/spinwheel.test.ts
 *
 * Test personas (sandbox): Christy Jenoval (DOB 1967-06-08), Aldo Cherry (DOB 1990-01-01)
 * Sandbox OTP: 000000
 */
import { describe, it, expect } from 'vitest';
import { sendSmsOtp, verifySmsOtp, getDebtProfile, getUser, deleteUser } from '../../src/spinwheel/client.js';

const skip =
  !process.env.INTEGRATION_TEST ||
  !process.env.SPINWHEEL_SECRET_KEY ||
  !process.env.SPINWHEEL_TEST_PHONE;

// Unique extUserId per test run to avoid conflicts with stale sandbox state.
const EXT_USER_ID = `integration-test-${Date.now()}`;
const PHONE = process.env.SPINWHEEL_TEST_PHONE ?? '';
const DOB = '1967-06-08'; // Christy Jenoval
const SANDBOX_OTP = '000000';

describe('Spinwheel sandbox — full OTP flow', () => {
  let spinwheelUserId: string | undefined;

  it.skipIf(skip)('sendSmsOtp returns a spinwheelUserId', async () => {
    const result = await sendSmsOtp({
      phoneNumber: PHONE,
      dateOfBirth: DOB,
      extUserId: EXT_USER_ID,
    });

    expect(typeof result.spinwheelUserId).toBe('string');
    expect(result.spinwheelUserId.length).toBeGreaterThan(0);
    spinwheelUserId = result.spinwheelUserId;
  });

  it.skipIf(skip)('verifySmsOtp succeeds with sandbox OTP 000000', async () => {
    if (!spinwheelUserId) {
      const r = await sendSmsOtp({ phoneNumber: PHONE, dateOfBirth: DOB, extUserId: EXT_USER_ID });
      spinwheelUserId = r.spinwheelUserId;
    }

    // Does not throw on success — void return.
    await expect(verifySmsOtp({ spinwheelUserId, code: SANDBOX_OTP })).resolves.toBeUndefined();
  });

  it.skipIf(skip)('getDebtProfile returns array of debts', async () => {
    if (!spinwheelUserId) {
      const r = await sendSmsOtp({ phoneNumber: PHONE, dateOfBirth: DOB, extUserId: EXT_USER_ID });
      spinwheelUserId = r.spinwheelUserId;
      await verifySmsOtp({ spinwheelUserId, code: SANDBOX_OTP });
    }

    const debts = await getDebtProfile(spinwheelUserId);

    expect(Array.isArray(debts)).toBe(true);
    // Sandbox persona has at least one debt; if the array is non-empty, validate shape.
    const debt = debts[0];
    if (debt) {
      expect(typeof debt.id).toBe('string');
      expect(typeof debt.type).toBe('string');
    }
  });

  it.skipIf(skip)('getUser returns user object', async () => {
    if (!spinwheelUserId) {
      const r = await sendSmsOtp({ phoneNumber: PHONE, dateOfBirth: DOB, extUserId: EXT_USER_ID });
      spinwheelUserId = r.spinwheelUserId;
      await verifySmsOtp({ spinwheelUserId, code: SANDBOX_OTP });
    }

    const user = await getUser(spinwheelUserId);

    expect(user).toBeDefined();
    expect(typeof user).toBe('object');
  });

  it.skipIf(skip)('deleteUser removes the test user', async () => {
    if (!spinwheelUserId) {
      const r = await sendSmsOtp({ phoneNumber: PHONE, dateOfBirth: DOB, extUserId: EXT_USER_ID });
      spinwheelUserId = r.spinwheelUserId;
      await verifySmsOtp({ spinwheelUserId, code: SANDBOX_OTP });
    }

    // Does not throw on success; 404 is also tolerated by the client.
    await expect(deleteUser(spinwheelUserId)).resolves.toBeUndefined();
    spinwheelUserId = undefined;
  });
});
