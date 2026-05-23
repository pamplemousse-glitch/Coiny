import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/spinwheel/client.js', () => ({
  sendSmsOtp: vi.fn(),
  verifySmsOtp: vi.fn(),
  getDebtProfile: vi.fn(),
  deleteUser: vi.fn(),
}));

import { deleteUser, getDebtProfile, sendSmsOtp, verifySmsOtp } from '../src/spinwheel/client.js';

const mockedSendSmsOtp = vi.mocked(sendSmsOtp);
const mockedVerifySmsOtp = vi.mocked(verifySmsOtp);
const mockedGetDebtProfile = vi.mocked(getDebtProfile);
const mockedDeleteUser = vi.mocked(deleteUser);

describe('GET /api/spinwheel/status', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns connected: false when no connection exists', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spinwheel/status', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ connected: false });

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spinwheel/status' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /api/spinwheel/connect/sms', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing phoneNumber', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ dateOfBirth: '1990-01-01' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for missing dateOfBirth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+15551234567' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('calls sendSmsOtp, stores pending, and returns ok: true', async () => {
    mockedSendSmsOtp.mockResolvedValue({ spinwheelUserId: 'sw-pending-001' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+15551234567', dateOfBirth: '1990-01-01' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockedSendSmsOtp).toHaveBeenCalledWith({
      phoneNumber: '+15551234567',
      dateOfBirth: '1990-01-01',
      extUserId: testUserId,
    });

    await app.close();
  });
});

describe('POST /api/spinwheel/connect/sms/verify', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing code', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 409 when no pending OTP', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    });
    expect(res.statusCode).toBe(409);

    await app.close();
  });

  it('persists connection and returns ok: true', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelPending } = await import('../src/db/schema.js');
    await db().insert(spinwheelPending).values({ userId: testUserId, spinwheelUserId: 'sw-user-001' });

    mockedVerifySmsOtp.mockResolvedValue(undefined);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ code: '654321' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockedVerifySmsOtp).toHaveBeenCalledWith({ spinwheelUserId: 'sw-user-001', code: '654321' });

    const status = await app.inject({ method: 'GET', url: '/api/spinwheel/status', headers: authHeader() });
    expect(status.json<{ connected: boolean }>().connected).toBe(true);

    await app.close();
  });

  it('upserts connection on re-verify', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelPending } = await import('../src/db/schema.js');
    mockedVerifySmsOtp.mockResolvedValue(undefined);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const headers = { ...authHeader(), 'content-type': 'application/json' };

    await db().insert(spinwheelPending).values({ userId: testUserId, spinwheelUserId: 'sw-user-old' });
    await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms/verify',
      headers,
      body: JSON.stringify({ code: '000000' }),
    });

    // simulate a second OTP send storing new spinwheelUserId
    await db()
      .insert(spinwheelPending)
      .values({ userId: testUserId, spinwheelUserId: 'sw-user-new' })
      .onConflictDoUpdate({ target: spinwheelPending.userId, set: { spinwheelUserId: 'sw-user-new' } });

    const second = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms/verify',
      headers,
      body: JSON.stringify({ code: '000000' }),
    });
    expect(second.statusCode).toBe(200);

    await app.close();
  });
});

describe('GET /api/spinwheel/debts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 409 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spinwheel/debts', headers: authHeader() });
    expect(res.statusCode).toBe(409);

    await app.close();
  });

  it('returns debts from Spinwheel when connected', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-abc' });

    mockedGetDebtProfile.mockResolvedValue([
      { id: 'debt-1', type: 'STUDENT_LOAN', balance: 15000, interestRate: 5.5, minimumPayment: 200 },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spinwheel/debts', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ debts: { id: string; type: string }[] }>();
    expect(body.debts).toHaveLength(1);
    expect(body.debts[0]?.type).toBe('STUDENT_LOAN');
    expect(mockedGetDebtProfile).toHaveBeenCalledWith('sw-abc');

    await app.close();
  });
});

describe('DELETE /api/spinwheel/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 204 even when no connection exists', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/spinwheel/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });

  it('removes existing connection and calls deleteUser', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-del' });

    mockedDeleteUser.mockResolvedValue(undefined);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/spinwheel/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(mockedDeleteUser).toHaveBeenCalledWith('sw-del');

    const status = await app.inject({ method: 'GET', url: '/api/spinwheel/status', headers: authHeader() });
    expect(status.json<{ connected: boolean }>().connected).toBe(false);

    await app.close();
  });
});
