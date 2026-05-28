import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

vi.mock('../src/discogs/client.js', () => ({
  getRequestToken: vi.fn(),
  getAccessToken: vi.fn(),
  getUsername: vi.fn(),
  syncCollection: vi.fn(),
}));

import { getAccessToken, getRequestToken, getUsername, syncCollection } from '../src/discogs/client.js';

const mockedGetRequestToken = vi.mocked(getRequestToken);
const mockedGetAccessToken = vi.mocked(getAccessToken);
const mockedGetUsername = vi.mocked(getUsername);
const mockedSyncCollection = vi.mocked(syncCollection);

describe('POST /api/discogs/connect/request', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns authorizeUrl and stores pending token', async () => {
    mockedGetRequestToken.mockResolvedValue({
      oauthToken: 'tok123',
      oauthTokenSecret: 'sec456',
      authorizeUrl: 'https://www.discogs.com/oauth/authorize?oauth_token=tok123',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/request',
      headers: authHeader(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ authorizeUrl: string }>().authorizeUrl).toContain('tok123');

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/discogs/connect/request' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /api/discogs/connect/verify', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 when no pending oauth request', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ oauthToken: 'tok123', oauthVerifier: 'ver789' }),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toMatch(/no pending/);

    await app.close();
  });

  it('returns 400 for oauth_token mismatch', async () => {
    mockedGetRequestToken.mockResolvedValue({
      oauthToken: 'tok123',
      oauthTokenSecret: 'sec456',
      authorizeUrl: 'https://www.discogs.com/oauth/authorize?oauth_token=tok123',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/discogs/connect/request', headers: authHeader() });

    const res = await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ oauthToken: 'WRONG', oauthVerifier: 'ver789' }),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toMatch(/mismatch/);

    await app.close();
  });

  it('completes oauth flow and returns username', async () => {
    mockedGetRequestToken.mockResolvedValue({
      oauthToken: 'tok123',
      oauthTokenSecret: 'sec456',
      authorizeUrl: 'https://www.discogs.com/oauth/authorize?oauth_token=tok123',
    });
    mockedGetAccessToken.mockResolvedValue({ accessToken: 'acc_token', accessTokenSecret: 'acc_secret' });
    mockedGetUsername.mockResolvedValue('vinyl_fan');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/discogs/connect/request', headers: authHeader() });

    const res = await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ oauthToken: 'tok123', oauthVerifier: 'ver789' }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean; username: string }>()).toMatchObject({ ok: true, username: 'vinyl_fan' });

    await app.close();
  });
});

describe('GET /api/discogs/status', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/discogs/status', headers: authHeader() });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ connected: boolean }>().connected).toBe(false);

    await app.close();
  });

  it('returns status after connect', async () => {
    mockedGetRequestToken.mockResolvedValue({
      oauthToken: 'tok123',
      oauthTokenSecret: 'sec456',
      authorizeUrl: 'https://www.discogs.com/oauth/authorize?oauth_token=tok123',
    });
    mockedGetAccessToken.mockResolvedValue({ accessToken: 'acc_token', accessTokenSecret: 'acc_secret' });
    mockedGetUsername.mockResolvedValue('vinyl_fan');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/discogs/connect/request', headers: authHeader() });
    await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ oauthToken: 'tok123', oauthVerifier: 'ver789' }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/discogs/status', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ connected: boolean; username: string }>()).toMatchObject({
      connected: true,
      username: 'vinyl_fan',
    });

    await app.close();
  });
});

describe('POST /api/discogs/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/discogs/sync', headers: authHeader() });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('syncs collection and returns totals', async () => {
    mockedGetRequestToken.mockResolvedValue({
      oauthToken: 'tok123',
      oauthTokenSecret: 'sec456',
      authorizeUrl: 'https://www.discogs.com/oauth/authorize?oauth_token=tok123',
    });
    mockedGetAccessToken.mockResolvedValue({ accessToken: 'acc_token', accessTokenSecret: 'acc_secret' });
    mockedGetUsername.mockResolvedValue('vinyl_fan');
    mockedSyncCollection.mockResolvedValue({ totalUsd: 245.5, releaseCount: 12, pricedCount: 10 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/discogs/connect/request', headers: authHeader() });
    await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ oauthToken: 'tok123', oauthVerifier: 'ver789' }),
    });

    const res = await app.inject({ method: 'POST', url: '/api/discogs/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ totalUsd: number; releaseCount: number; pricedCount: number }>()).toMatchObject({
      totalUsd: 245.5,
      releaseCount: 12,
      pricedCount: 10,
    });

    // status should show the updated total
    const status = await app.inject({ method: 'GET', url: '/api/discogs/status', headers: authHeader() });
    expect(status.json<{ lastCollectionUsd: number }>().lastCollectionUsd).toBe(245.5);

    await app.close();
  });
});

describe('DELETE /api/discogs/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes connection, status returns 404 after disconnect', async () => {
    mockedGetRequestToken.mockResolvedValue({
      oauthToken: 'tok123',
      oauthTokenSecret: 'sec456',
      authorizeUrl: 'https://www.discogs.com/oauth/authorize?oauth_token=tok123',
    });
    mockedGetAccessToken.mockResolvedValue({ accessToken: 'acc_token', accessTokenSecret: 'acc_secret' });
    mockedGetUsername.mockResolvedValue('vinyl_fan');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/discogs/connect/request', headers: authHeader() });
    await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ oauthToken: 'tok123', oauthVerifier: 'ver789' }),
    });

    const del = await app.inject({ method: 'DELETE', url: '/api/discogs/connect', headers: authHeader() });
    expect(del.statusCode).toBe(204);

    const status = await app.inject({ method: 'GET', url: '/api/discogs/status', headers: authHeader() });
    expect(status.statusCode).toBe(404);

    await app.close();
  });
});

describe('GET /api/net-worth — discogs vinyl rollup', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes vinyl total from discogs connection', async () => {
    mockedGetRequestToken.mockResolvedValue({
      oauthToken: 'tok123',
      oauthTokenSecret: 'sec456',
      authorizeUrl: 'https://www.discogs.com/oauth/authorize?oauth_token=tok123',
    });
    mockedGetAccessToken.mockResolvedValue({ accessToken: 'acc_token', accessTokenSecret: 'acc_secret' });
    mockedGetUsername.mockResolvedValue('vinyl_fan');
    mockedSyncCollection.mockResolvedValue({ totalUsd: 320, releaseCount: 15, pricedCount: 13 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/discogs/connect/request', headers: authHeader() });
    await app.inject({
      method: 'POST',
      url: '/api/discogs/connect/verify',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ oauthToken: 'tok123', oauthVerifier: 'ver789' }),
    });
    await app.inject({ method: 'POST', url: '/api/discogs/sync', headers: authHeader() });

    const nw = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(nw.statusCode).toBe(200);
    const body = nw.json<{ vinyl: number; connections: { discogs: boolean } }>();
    expect(body.vinyl).toBe(320);
    expect(body.connections.discogs).toBe(true);

    await app.close();
  });
});
