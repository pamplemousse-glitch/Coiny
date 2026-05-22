import { z } from 'zod';
import { config } from '../config.js';

// Spinwheel sandbox base URL. Switch to production URL when going live.
const BASE_URL = 'https://sandbox-api.spinwheel.io';

export class SpinwheelError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SpinwheelError';
  }
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.SPINWHEEL_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function spinwheelPost<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new SpinwheelError(res.status, `Spinwheel POST ${path} failed (${res.status}): ${text}`);
  }

  const raw: unknown = await res.json();
  return schema.parse(raw);
}

async function spinwheelGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new SpinwheelError(res.status, `Spinwheel GET ${path} failed (${res.status}): ${text}`);
  }

  const raw: unknown = await res.json();
  return schema.parse(raw);
}

/**
 * Initiates an SMS OTP challenge for the given phone number.
 */
export async function sendSmsOtp(params: { phone: string; dateOfBirth: string; extUserId: string }): Promise<void> {
  const OkSchema = z.object({}).passthrough();
  await spinwheelPost(
    '/v1/users/otp/send',
    {
      phone: params.phone,
      dateOfBirth: params.dateOfBirth,
      extUserId: params.extUserId,
    },
    OkSchema,
  );
}

const VerifyOtpResponseSchema = z.object({
  userId: z.string(),
});

/**
 * Verifies the OTP code and returns the Spinwheel user ID.
 */
export async function verifySmsOtp(params: {
  phone: string;
  code: string;
  extUserId: string;
}): Promise<{ spinwheelUserId: string }> {
  const result = await spinwheelPost(
    '/v1/users/otp/verify',
    {
      phone: params.phone,
      code: params.code,
      extUserId: params.extUserId,
    },
    VerifyOtpResponseSchema,
  );
  return { spinwheelUserId: result.userId };
}

const SpinwheelDebtSchema = z.object({
  id: z.string(),
  type: z.string(),
  balance: z.number(),
  interestRate: z.number(),
  minimumPayment: z.number(),
});

const DebtsResponseSchema = z.object({
  debts: z.array(SpinwheelDebtSchema),
});

export type SpinwheelDebt = z.infer<typeof SpinwheelDebtSchema>;

/**
 * Returns all debts for a Spinwheel user.
 */
export async function getDebts(spinwheelUserId: string): Promise<SpinwheelDebt[]> {
  const result = await spinwheelGet(`/v1/users/${encodeURIComponent(spinwheelUserId)}/debts`, DebtsResponseSchema);
  return result.debts;
}
