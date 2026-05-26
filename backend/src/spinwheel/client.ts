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
  dueDate: z.string().nullable().optional(),
  accountStatus: z.enum(['OPEN', 'CLOSED', 'DELINQUENT']).nullable().optional(),
  lastPaymentDate: z.string().nullable().optional(),
  openDate: z.string().nullable().optional(),
  paymentHistoryCodes: z.array(z.string()).nullable().optional(),
});

export type SpinwheelDebt = z.infer<typeof SpinwheelDebtSchema>;

// Spinwheel docs require these fields in every debtProfile request body.
const DEBT_PROFILE_BODY = {
  creditReportType: '1_BUREAU.FULL',
  sourceBureau: 'Equifax',
  creditScoreModel: 'VANTAGE_SCORE_3_0',
} as const;

const DEBT_LIABILITY_KEYS = [
  'debts',
  'creditCards',
  'autoLoans',
  'studentLoans',
  'homeLoans',
  'personalLoans',
  'miscellaneousLiabilities',
] as const;

// Shared internal fetch: POST /v1/users/{spinwheelUserId}/debtProfile with required params.
async function fetchRawDebtProfile(spinwheelUserId: string): Promise<Record<string, unknown>> {
  const schema = envelopeSchema(z.object({}).passthrough());
  const result = await spinwheelPost(
    `/v1/users/${encodeURIComponent(spinwheelUserId)}/debtProfile`,
    DEBT_PROFILE_BODY,
    schema,
  );
  return result.data as Record<string, unknown>;
}

// POST /v1/users/{spinwheelUserId}/debtProfile
// Returns normalized debt array across all liability types.
export async function getDebtProfile(spinwheelUserId: string): Promise<SpinwheelDebt[]> {
  const data = await fetchRawDebtProfile(spinwheelUserId);
  const raw: unknown[] = [];
  for (const key of DEBT_LIABILITY_KEYS) {
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

// Credit score + credit utilization from a single debtProfile call.
// Score lives in creditReports[0].profile.creditScore per Spinwheel docs.
export async function getCreditScore(
  spinwheelUserId: string,
): Promise<{ score: number | null; utilization: number | null }> {
  const data = await fetchRawDebtProfile(spinwheelUserId);

  const creditReports = Array.isArray(data.creditReports) ? data.creditReports : [];
  const report = creditReports[0] as Record<string, unknown> | undefined;
  const profile = report?.profile as Record<string, unknown> | undefined;
  const rawScore = profile?.creditScore;
  const score = typeof rawScore === 'number' ? rawScore : null;

  let utilization: number | null = null;
  const raw: unknown[] = [];
  for (const key of DEBT_LIABILITY_KEYS) {
    const arr = data[key];
    if (Array.isArray(arr)) raw.push(...arr);
  }
  const debts = raw.map((item) => SpinwheelDebtSchema.parse(item));
  const cards = debts.filter((d) => d.type === 'CREDIT_CARD');
  const totalBalance = cards.reduce((sum, c) => sum + (c.balance ?? 0), 0);
  const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit ?? 0), 0);
  if (totalLimit > 0) {
    utilization = Math.round((totalBalance / totalLimit) * 1000) / 10;
  }

  return { score, utilization };
}

// POST /v1/users/{spinwheelUserId}/subscriptions — registers a monthly credit profile pull.
// Call once after OTP verify; Spinwheel fires USER_DEBT_PROFILE_UPDATED webhooks monthly.
export async function subscribeMonthly(spinwheelUserId: string): Promise<void> {
  const schema = envelopeSchema(z.object({}).passthrough());
  await spinwheelPost(
    `/v1/users/${encodeURIComponent(spinwheelUserId)}/subscriptions`,
    { type: 'CREDIT_PROFILE', frequency: 'MONTHLY' },
    schema,
  );
}

// DELETE /v1/users/{spinwheelUserId} — called on disconnect to remove user data from Spinwheel.
export async function deleteUser(spinwheelUserId: string): Promise<void> {
  await spinwheelDelete(`/v1/users/${encodeURIComponent(spinwheelUserId)}`);
}
