import { z } from 'zod';
import { config } from '../config.js';

export class SpinwheelError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SpinwheelError';
  }
}

function requireKey(): string {
  if (!config.SPINWHEEL_SECRET_KEY) throw new SpinwheelError(0, 'SPINWHEEL_SECRET_KEY is not configured');
  return config.SPINWHEEL_SECRET_KEY;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireKey()}`,
    'Content-Type': 'application/json',
  };
}

// All Spinwheel responses are wrapped: { status: { code, desc, messages }, data: {...} }
function envelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    status: z.object({
      code: z.number(),
      desc: z.string().optional(),
      messages: z.array(z.object({ desc: z.string() })).optional(),
    }),
    data: dataSchema,
  });
}

async function spinwheelPost<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${config.SPINWHEEL_BASE_URL}${path}`, {
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
  const res = await fetch(`${config.SPINWHEEL_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${requireKey()}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new SpinwheelError(res.status, `Spinwheel GET ${path} failed (${res.status}): ${text}`);
  }

  const raw: unknown = await res.json();
  return schema.parse(raw);
}

async function spinwheelDelete(path: string): Promise<void> {
  const res = await fetch(`${config.SPINWHEEL_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${requireKey()}` },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new SpinwheelError(res.status, `Spinwheel DELETE ${path} failed (${res.status}): ${text}`);
  }
}

// POST /v1/users/connect/sms
// Body: { phoneNumber (E.164), dateOfBirth (YYYY-MM-DD), extUserId }
// Returns the Spinwheel userId needed for the subsequent verify call.
export async function sendSmsOtp(params: {
  phoneNumber: string;
  dateOfBirth: string;
  extUserId: string;
}): Promise<{ spinwheelUserId: string }> {
  const schema = envelopeSchema(z.object({ userId: z.string() }).passthrough());
  const result = await spinwheelPost('/v1/users/connect/sms', params, schema);
  return { spinwheelUserId: result.data.userId };
}

// POST /v1/users/{spinwheelUserId}/connect/sms/verify
// Body: { code } only — no phone or extUserId.
export async function verifySmsOtp(params: { spinwheelUserId: string; code: string }): Promise<void> {
  const schema = envelopeSchema(z.object({}).passthrough());
  await spinwheelPost(
    `/v1/users/${encodeURIComponent(params.spinwheelUserId)}/connect/sms/verify`,
    { code: params.code },
    schema,
  );
}

// Debt type taxonomy from Spinwheel docs.
const LiabilityTypeSchema = z.enum([
  'STUDENT_LOAN',
  'CREDIT_CARD',
  'HOME_LOAN',
  'AUTO_LOAN',
  'PERSONAL_LOAN',
  'MISCELLANEOUS_LIABILITY',
]);

export const SpinwheelDebtSchema = z.object({
  id: z.string(),
  type: LiabilityTypeSchema.catch('MISCELLANEOUS_LIABILITY'),
  balance: z.number().nullable().optional(),
  interestRate: z.number().nullable().optional(),
  minimumPayment: z.number().nullable().optional(),
  creditLimit: z.number().nullable().optional(),
});

export type SpinwheelDebt = z.infer<typeof SpinwheelDebtSchema>;

// POST /v1/users/{spinwheelUserId}/debtProfile
// Returns normalized debt array across all liability types.
export async function getDebtProfile(spinwheelUserId: string): Promise<SpinwheelDebt[]> {
  const DataSchema = z.object({}).passthrough();
  const schema = envelopeSchema(DataSchema);
  const result = await spinwheelPost(`/v1/users/${encodeURIComponent(spinwheelUserId)}/debtProfile`, {}, schema);

  // Spinwheel may return per-type arrays or a flat debts array depending on API version.
  // Normalize both shapes into our SpinwheelDebt[].
  const data = result.data as Record<string, unknown>;
  const liabilityKeys = [
    'debts',
    'creditCards',
    'autoLoans',
    'studentLoans',
    'homeLoans',
    'personalLoans',
    'miscellaneousLiabilities',
  ];
  const raw: unknown[] = [];
  for (const key of liabilityKeys) {
    const arr = data[key];
    if (Array.isArray(arr)) raw.push(...arr);
  }

  return raw.map((item) => SpinwheelDebtSchema.parse(item));
}

// GET /v1/users/{spinwheelUserId} — full user profile
export async function getUser(spinwheelUserId: string): Promise<Record<string, unknown>> {
  const schema = envelopeSchema(z.object({}).passthrough());
  const result = await spinwheelGet(`/v1/users/${encodeURIComponent(spinwheelUserId)}`, schema);
  return result.data as Record<string, unknown>;
}

// GET /v1/users/{spinwheelUserId} — credit score + credit utilization from debt profile.
// Returns score (vantageScore3 or similar) and utilization % across all credit cards.
export async function getCreditScore(
  spinwheelUserId: string,
): Promise<{ score: number | null; utilization: number | null }> {
  const user = await getUser(spinwheelUserId);
  const rawScore = user.vantageScore3 ?? user.creditScore ?? user.score;
  const score = typeof rawScore === 'number' ? rawScore : null;

  let utilization: number | null = null;
  try {
    const debts = await getDebtProfile(spinwheelUserId);
    const cards = debts.filter((d) => d.type === 'CREDIT_CARD');
    const totalBalance = cards.reduce((sum, c) => sum + (c.balance ?? 0), 0);
    const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit ?? 0), 0);
    if (totalLimit > 0) {
      utilization = Math.round((totalBalance / totalLimit) * 1000) / 10;
    }
  } catch {
    // utilization stays null if debt profile fails
  }

  return { score, utilization };
}

// DELETE /v1/users/{spinwheelUserId} — called on disconnect to remove user data from Spinwheel.
export async function deleteUser(spinwheelUserId: string): Promise<void> {
  await spinwheelDelete(`/v1/users/${encodeURIComponent(spinwheelUserId)}`);
}
