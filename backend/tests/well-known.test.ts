// Tests for src/api/well-known.ts (RFC 9116 security.txt) and the response
// security headers set by src/plugins/security-headers.ts. Both close rows in
// the pre-launch security audit (§1.11.8 and §1.10.1 / §1.6.2).

import { beforeEach, describe, expect, it } from 'vitest';
import { buildSecurityTxt, SECURITY_TXT_EXPIRES } from '../src/api/well-known.js';
import { resetDatabase } from './db-helper.js';

describe('GET /.well-known/security.txt', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('is served without authentication', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/.well-known/security.txt' });
    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it('serves text/plain with charset utf-8, as RFC 9116 section 3 requires', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/.well-known/security.txt' });
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');

    await app.close();
  });

  it('derives Canonical from the request host so a new domain needs no code change', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/.well-known/security.txt',
      headers: { host: 'coiny.app', 'x-forwarded-proto': 'https' },
    });
    expect(res.body).toContain('Canonical: https://coiny.app/.well-known/security.txt');

    await app.close();
  });
});

describe('security.txt content (RFC 9116)', () => {
  const body = buildSecurityTxt('https://example.test');

  it('carries exactly one Expires field, which the RFC makes mandatory', () => {
    const expires = body.split('\n').filter((l) => l.startsWith('Expires:'));
    expect(expires).toHaveLength(1);
  });

  it('carries at least one Contact field, which the RFC makes mandatory', () => {
    const contacts = body.split('\n').filter((l) => l.startsWith('Contact:'));
    expect(contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('links a policy', () => {
    expect(body).toContain('Policy: https://');
  });

  // The point of this test. An Expires date in the past tells a researcher the
  // project stopped paying attention, and nothing else in the repo would notice.
  // Failing 30 days early turns "the file quietly rotted" into "a red test told
  // you to bump it and re-check the contact channel still works".
  it('does not expire within the next 30 days', () => {
    const expiresAt = new Date(SECURITY_TXT_EXPIRES);
    expect(Number.isNaN(expiresAt.getTime())).toBe(false);

    const thirtyDaysOut = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThan(thirtyDaysOut);
  });

  it('omits Canonical when the origin is unknown rather than emitting a relative URI', () => {
    expect(buildSecurityTxt(null)).not.toContain('Canonical:');
  });
});

describe('response security headers', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('sets HSTS and nosniff on a public route', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    await app.close();
  });

  it('sets them on an error response too, not just the happy path', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pets' });
    expect(res.statusCode).toBe(401);
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    await app.close();
  });

  // Documents the deliberate omissions in security-headers.ts. If someone adds
  // helmet later, this test fails and forces them to read the reasoning first.
  it('does not set headers that only govern a browser-rendered document', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['content-security-policy']).toBeUndefined();
    expect(res.headers['x-frame-options']).toBeUndefined();
    expect(res.headers['referrer-policy']).toBeUndefined();
    expect(res.headers['cross-origin-opener-policy']).toBeUndefined();

    await app.close();
  });
});
