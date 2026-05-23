import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: {
    SPINWHEEL_SECRET_KEY: 'test-secret-key',
    SPINWHEEL_BASE_URL: 'https://sandbox-api.spinwheel.io',
  },
}));

function envelope(data: unknown, status = 200): Response {
  const body = { status: { code: status }, data };
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function errorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({ status: { code: status }, data: {} }),
    text: async () => JSON.stringify({ error: 'error' }),
  } as unknown as Response;
}

describe('spinwheel sendSmsOtp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts OTP request to correct endpoint and returns spinwheelUserId', async () => {
    vi.mocked(fetch).mockResolvedValue(envelope({ userId: 'sw-xyz-123' }));

    const { sendSmsOtp } = await import('../src/spinwheel/client.js');
    const result = await sendSmsOtp({ phoneNumber: '+15551234567', dateOfBirth: '1990-01-01', extUserId: 'user-1' });
    expect(result.spinwheelUserId).toBe('sw-xyz-123');

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/v1/users/connect/sms'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws SpinwheelError on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(400));

    const { sendSmsOtp, SpinwheelError } = await import('../src/spinwheel/client.js');
    await expect(
      sendSmsOtp({ phoneNumber: '+1', dateOfBirth: '1990-01-01', extUserId: 'user-1' }),
    ).rejects.toBeInstanceOf(SpinwheelError);
  });
});

describe('spinwheel verifySmsOtp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to correct path with spinwheelUserId and resolves void', async () => {
    vi.mocked(fetch).mockResolvedValue(envelope({}));

    const { verifySmsOtp } = await import('../src/spinwheel/client.js');
    await expect(verifySmsOtp({ spinwheelUserId: 'sw-abc-123', code: '123456' })).resolves.toBeUndefined();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/v1/users/sw-abc-123/connect/sms/verify'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws SpinwheelError on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(401));

    const { verifySmsOtp, SpinwheelError } = await import('../src/spinwheel/client.js');
    await expect(verifySmsOtp({ spinwheelUserId: 'sw-bad', code: 'bad' })).rejects.toBeInstanceOf(SpinwheelError);
  });
});

describe('spinwheel getDebtProfile', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to debtProfile endpoint and returns parsed debts', async () => {
    vi.mocked(fetch).mockResolvedValue(
      envelope({
        studentLoans: [{ id: 'd-1', type: 'STUDENT_LOAN', balance: 10000, interestRate: 4.5, minimumPayment: 150 }],
      }),
    );

    const { getDebtProfile } = await import('../src/spinwheel/client.js');
    const debts = await getDebtProfile('sw-user-1');
    expect(debts).toHaveLength(1);
    expect(debts[0]?.id).toBe('d-1');
    expect(debts[0]?.type).toBe('STUDENT_LOAN');
    expect(debts[0]?.balance).toBe(10000);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/v1/users/sw-user-1/debtProfile'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('normalizes multiple liability arrays into flat list', async () => {
    vi.mocked(fetch).mockResolvedValue(
      envelope({
        studentLoans: [{ id: 's-1', type: 'STUDENT_LOAN', balance: 5000 }],
        creditCards: [{ id: 'c-1', type: 'CREDIT_CARD', balance: 2000 }],
      }),
    );

    const { getDebtProfile } = await import('../src/spinwheel/client.js');
    const debts = await getDebtProfile('sw-user-1');
    expect(debts).toHaveLength(2);
  });

  it('throws SpinwheelError when API returns error', async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(404));

    const { getDebtProfile, SpinwheelError } = await import('../src/spinwheel/client.js');
    await expect(getDebtProfile('sw-bad')).rejects.toBeInstanceOf(SpinwheelError);
  });
});
