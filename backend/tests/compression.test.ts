import { gunzipSync } from 'node:zlib';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MIN_COMPRESS_BYTES, registerCompression } from '../src/plugins/compression.js';

// A body comfortably over the threshold, and repetitive the way a real
// NetWorthResponse is (the same 26 class keys, the same currency codes), so the
// ratio measured here is in the same family as the 5.3x to 13.2x audit 4.6.2
// measured on the real shape rather than on random noise, which never compresses.
const BIG = {
  classes: Array.from({ length: 40 }, (_, i) => ({
    class: `asset_class_${i}`,
    value_usd: 1234.56,
    currency: 'USD',
    as_of: '2026-08-18T00:00:00.000Z',
    error: null,
  })),
};

let app: FastifyInstance;

beforeEach(async () => {
  app = Fastify();
  registerCompression(app);
  app.get('/big', async () => BIG);
  app.get('/small', async () => ({ ok: true }));
  app.get('/binary', async (_req, reply) => {
    reply.header('content-type', 'image/png');
    return Buffer.alloc(4096, 7);
  });
  app.get('/preencoded', async (_req, reply) => {
    reply.header('content-encoding', 'br');
    return Buffer.alloc(4096, 7);
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

const GZIP = { 'accept-encoding': 'gzip, deflate' };

describe('response compression', () => {
  it('gzips a response above the threshold', async () => {
    const res = await app.inject({ method: 'GET', url: '/big', headers: GZIP });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(JSON.parse(gunzipSync(res.rawPayload).toString('utf8'))).toEqual(BIG);
  });

  // The point of the change is the ratio, not the header. A hook that set
  // Content-Encoding and shrank nothing would pass a header-only assertion.
  it('actually shrinks the payload substantially', async () => {
    const plain = await app.inject({ method: 'GET', url: '/big' });
    const gzipped = await app.inject({ method: 'GET', url: '/big', headers: GZIP });

    const ratio = plain.rawPayload.byteLength / gzipped.rawPayload.byteLength;
    expect(ratio).toBeGreaterThan(3);
  });

  // Stale Content-Length is the failure that looks fine in a test that only
  // reads the decoded body: the client reads that many bytes and then hangs or
  // truncates.
  it('rewrites Content-Length to the compressed length', async () => {
    const res = await app.inject({ method: 'GET', url: '/big', headers: GZIP });

    expect(Number(res.headers['content-length'])).toBe(res.rawPayload.byteLength);
  });

  it('leaves a small response alone', async () => {
    const res = await app.inject({ method: 'GET', url: '/small', headers: GZIP });

    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.json()).toEqual({ ok: true });
  });

  it('leaves the body alone when the client does not accept gzip', async () => {
    const res = await app.inject({ method: 'GET', url: '/big' });

    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.json()).toEqual(BIG);
  });

  // `gzip;q=0` is a refusal. Reading it as a request hands the client bytes it
  // has just said it cannot decode.
  it('treats gzip;q=0 as a refusal', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/big',
      headers: { 'accept-encoding': 'gzip;q=0, deflate' },
    });

    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.json()).toEqual(BIG);
  });

  it('honours a bare wildcard', async () => {
    const res = await app.inject({ method: 'GET', url: '/big', headers: { 'accept-encoding': '*' } });

    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('does not compress an already-compressed content type', async () => {
    const res = await app.inject({ method: 'GET', url: '/binary', headers: GZIP });

    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('does not double-encode a body something else already encoded', async () => {
    const res = await app.inject({ method: 'GET', url: '/preencoded', headers: GZIP });

    expect(res.headers['content-encoding']).toBe('br');
  });

  // Set even when the response went out uncompressed: a shared cache that
  // stored the plain body without this could serve it to a gzip client, or
  // worse, serve gzip bytes to one that never asked.
  it('sets Vary on responses it did not compress', async () => {
    const res = await app.inject({ method: 'GET', url: '/small' });

    expect(res.headers.vary).toBe('Accept-Encoding');
  });

  it('sets Vary on responses it did compress', async () => {
    const res = await app.inject({ method: 'GET', url: '/big', headers: GZIP });

    expect(res.headers.vary).toBe('Accept-Encoding');
  });

  it('exposes a threshold at the documented 1 KiB', () => {
    expect(MIN_COMPRESS_BYTES).toBe(1024);
  });
});

describe('compression on the real app', () => {
  // The unit tests above build their own Fastify instance, so they would all
  // still pass if the hook were never registered in server.ts. This is the one
  // that fails if the wiring is dropped.
  it('is registered on the app the server actually builds', async () => {
    const { buildApp } = await import('../src/server.js');
    const real = await buildApp();

    const res = await real.inject({ method: 'GET', url: '/health', headers: GZIP });
    expect(res.headers.vary).toBe('Accept-Encoding');

    await real.close();
  });
});
