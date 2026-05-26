import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/snaptrade/client.js', () => ({
  snapRegisterUser: vi.fn(),
  snapGetLoginUrl: vi.fn(),
  snapGetAccounts: vi.fn(),
  snapDeleteUser: vi.fn(),
}));

import { snapDeleteUser, snapGetAccounts, snapGetLoginUrl, snapRegisterUser } from '../src/snaptrade/client.js';

const mockedRegister = vi.mocked(snapRegisterUser);
const mockedLoginUrl = vi.mocked(snapGetLoginUrl);
const mockedAccounts = vi.mocked(snapGetAccounts);
const mockedDelete = vi.mocked(snapDeleteUser);

const fakeAccount = {
  id: 'acc-1',
  name: 'Fidelity Brokerage',
  institution_name: 'Fidelity',
  balance: { total: { amount: 25000, currency: 'USD' } },
};

describe('POST /api/snaptrade/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('registers user and returns redirect URL', async () => {
    mockedRegister.mockResolvedValue({ userId: testUserId, userSecret: 'secret-123' });
    mockedLoginUrl.mockResolvedValue('https://connect.snaptrade.com/portal/abc');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/snaptrade/connect', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ redirectUrl: string }>().redirectUrl).toBe('https://connect.snaptrade.com/portal/abc');

    await app.close();
  });

  it('reuses existing connection and returns new redirect URL', async () => {
    mockedRegister.mockResolvedValue({ userId: testUserId, userSecret: 'secret-123' });
    mockedLoginUrl.mockResolvedValue('https://connect.snaptrade.com/portal/abc');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/snaptrade/connect', headers: authHeader() });
    mockedLoginUrl.mockResolvedValue('https://connect.snaptrade.com/portal/xyz');
    const res = await app.inject({ method: 'POST', url: '/api/snaptrade/connect', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    expect(mockedRegister).toHaveBeenCalledTimes(1);
    expect(res.json<{ redirectUrl: string }>().redirectUrl).toBe('https://connect.snaptrade.com/portal/xyz');

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/snaptrade/connect' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe('GET /api/snaptrade/accounts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/snaptrade/accounts', headers: authHeader() });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('returns accounts when connected', async () => {
    mockedRegister.mockResolvedValue({ userId: testUserId, userSecret: 'secret-123' });
    mockedLoginUrl.mockResolvedValue('https://connect.snaptrade.com/portal/abc');
    mockedAccounts.mockResolvedValue([fakeAccount]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/snaptrade/connect', headers: authHeader() });
    const res = await app.inject({ method: 'GET', url: '/api/snaptrade/accounts', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; totalUsd: number }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.totalUsd).toBe(25000);

    await app.close();
  });
});

describe('POST /api/snaptrade/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('caches total brokerage balance', async () => {
    mockedRegister.mockResolvedValue({ userId: testUserId, userSecret: 'secret-123' });
    mockedLoginUrl.mockResolvedValue('https://connect.snaptrade.com/portal/abc');
    mockedAccounts.mockResolvedValue([fakeAccount]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/snaptrade/connect', headers: authHeader() });
    const res = await app.inject({ method: 'POST', url: '/api/snaptrade/sync', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ total: number; accounts: number }>().total).toBe(25000);
    expect(res.json<{ total: number; accounts: number }>().accounts).toBe(1);

    await app.close();
  });
});

describe('DELETE /api/snaptrade/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('deregisters user and removes connection', async () => {
    mockedRegister.mockResolvedValue({ userId: testUserId, userSecret: 'secret-123' });
    mockedLoginUrl.mockResolvedValue('https://connect.snaptrade.com/portal/abc');
    mockedDelete.mockResolvedValue(undefined);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/snaptrade/connect', headers: authHeader() });
    const res = await app.inject({ method: 'DELETE', url: '/api/snaptrade/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const check = await app.inject({ method: 'GET', url: '/api/snaptrade/accounts', headers: authHeader() });
    expect(check.statusCode).toBe(404);

    await app.close();
  });
});
