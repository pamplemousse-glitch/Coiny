import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('spinwheel sendSmsOtp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts OTP request to Spinwheel and resolves', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}));

    const { sendSmsOtp } = await import('../src/spinwheel/client.js');
    await expect(
      sendSmsOtp({ phone: '+15551234567', dateOfBirth: '1990-01-01', extUserId: 'user-1' }),
    ).resolves.toBeUndefined();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/v1/users/otp/send'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws SpinwheelError on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ message: 'Bad request' }, 400));

    const { sendSmsOtp, SpinwheelError } = await import('../src/spinwheel/client.js');
    await expect(
      sendSmsOtp({ phone: '+1', dateOfBirth: '1990-01-01', extUserId: 'user-1' }),
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

  it('returns spinwheelUserId from verify response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ userId: 'sw-abc-123' }));

    const { verifySmsOtp } = await import('../src/spinwheel/client.js');
    const result = await verifySmsOtp({ phone: '+15551234567', code: '123456', extUserId: 'user-1' });
    expect(result.spinwheelUserId).toBe('sw-abc-123');
  });

  it('throws SpinwheelError on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ error: 'Invalid OTP' }, 401));

    const { verifySmsOtp, SpinwheelError } = await import('../src/spinwheel/client.js');
    await expect(
      verifySmsOtp({ phone: '+1', code: 'bad', extUserId: 'u1' }),
    ).rejects.toBeInstanceOf(SpinwheelError);
  });
});

describe('spinwheel getDebts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed debt list', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        debts: [
          { id: 'd-1', type: 'student_loan', balance: 10000, interestRate: 4.5, minimumPayment: 150 },
        ],
      }),
    );

    const { getDebts } = await import('../src/spinwheel/client.js');
    const debts = await getDebts('sw-user-1');
    expect(debts).toHaveLength(1);
    expect(debts[0]?.id).toBe('d-1');
    expect(debts[0]?.balance).toBe(10000);
  });

  it('throws SpinwheelError when API returns error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ error: 'not found' }, 404));

    const { getDebts, SpinwheelError } = await import('../src/spinwheel/client.js');
    await expect(getDebts('sw-bad')).rejects.toBeInstanceOf(SpinwheelError);
  });
});
