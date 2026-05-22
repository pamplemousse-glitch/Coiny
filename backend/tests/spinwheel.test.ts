import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/spinwheel/client.js', () => ({
  sendSmsOtp: vi.fn(),
  verifySmsOtp: vi.fn(),
  getDebts: vi.fn(),
}));

import { getDebts, sendSmsOtp, verifySmsOtp } from '../src/spinwheel/client.js';

const mockedSendSmsOtp = vi.mocked(sendSmsOtp);
const mockedVerifySmsOtp = vi.mocked(verifySmsOtp);
const mockedGetDebts = vi.mocked(getDebts);

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

  it('returns 400 for missing phone', async () => {
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
      body: JSON.stringify({ phone: '+15551234567' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('calls sendSmsOtp and returns ok: true', async () => {
    mockedSendSmsOtp.mockResolvedValue(undefined);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+15551234567', dateOfBirth: '1990-01-01' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockedSendSmsOtp).toHaveBeenCalledWith({ phone: '+15551234567', dateOfBirth: '1990-01-01', extUserId: testUserId });

    await app.close();
  });
});

describe('POST /api/spinwheel/connect/sms/verify', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing phone', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('persists connection and returns ok: true', async () => {
    mockedVerifySmsOtp.mockResolvedValue({ spinwheelUserId: 'sw-user-001' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/spinwheel/connect/sms/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+15551234567', code: '654321' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    const status = await app.inject({ method: 'GET', url: '/api/spinwheel/status', headers: authHeader() });
    expect(status.json<{ connected: boolean }>().connected).toBe(true);

    await app.close();
  });

  it('upserts connection on re-verify', async () => {
    mockedVerifySmsOtp
      .mockResolvedValueOnce({ spinwheelUserId: 'sw-user-old' })
      .mockResolvedValueOnce({ spinwheelUserId: 'sw-user-new' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const body = JSON.stringify({ phone: '+15551234567', code: '000000' });
    const headers = { ...authHeader(), 'content-type': 'application/json' };

    await app.inject({ method: 'POST', url: '/api/spinwheel/connect/sms/verify', headers, body });
    const second = await app.inject({ method: 'POST', url: '/api/spinwheel/connect/sms/verify', headers, body });
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

    mockedGetDebts.mockResolvedValue([
      { id: 'debt-1', type: 'student_loan', balance: 15000, interestRate: 5.5, minimumPayment: 200 },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spinwheel/debts', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ debts: { id: string; type: string }[] }>();
    expect(body.debts).toHaveLength(1);
    expect(body.debts[0]?.type).toBe('student_loan');
    expect(mockedGetDebts).toHaveBeenCalledWith('sw-abc');

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

  it('removes existing connection', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-del' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/spinwheel/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const status = await app.inject({ method: 'GET', url: '/api/spinwheel/status', headers: authHeader() });
    expect(status.json<{ connected: boolean }>().connected).toBe(false);

    await app.close();
  });
});
