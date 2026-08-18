// The standing proof for PRD §31.1 and §31.2 (R-31.12).
//
// 01-security.md 1.8.3 checked this with a grep, at a point in time, and
// recorded the result as "VERIFIED by convention, FAILS as a control". This
// file is the difference between those two: it drives real requests through
// the real app with pino writing to a stream, and reads what actually came
// out.
//
// The forbidden strings live HERE and not in the source, deliberately. A test
// that imports the redact list from the thing it is testing proves only that
// the list equals itself.

import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

/** Values that must never appear anywhere in a serialised log line, whatever
 *  key they arrive under and whatever string they are embedded in. */
const FORBIDDEN = [
  'Chase Sapphire Preferred', // institution / merchant name
  'user@example.com', // email
  'access-sandbox-must-not-log', // credential
  '001234.abcdef0123456789.0000', // Apple `sub`
  '4821.55', // amount
];

/** Captures every line pino writes, parsed. */
function captureStream(): { lines: Record<string, unknown>[]; raw: string[]; stream: Writable } {
  const lines: Record<string, unknown>[] = [];
  const raw: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      const text = String(chunk);
      raw.push(text);
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          lines.push(JSON.parse(line) as Record<string, unknown>);
        } catch {
          // Not JSON; keep it in `raw` so a forbidden-string sweep still sees it.
        }
      }
      cb();
    },
  });
  return { lines, raw, stream };
}

let capture: ReturnType<typeof captureStream>;

beforeEach(async () => {
  await resetDatabase();
  capture = captureStream();
});

afterEach(() => {
  capture.lines.length = 0;
  capture.raw.length = 0;
});

async function buildAppWithCapturedLogs() {
  const { buildApp } = await import('../src/server.js');
  // 'info' explicitly: tests/setup.ts sets LOG_LEVEL=silent, and a redaction
  // suite reading an empty stream would pass every assertion by asserting
  // nothing at all. That is the exact false pass this file exists to prevent.
  return buildApp({ loggerStream: capture.stream, loggerLevel: 'info' });
}

describe('the request log line', () => {
  // Bound to the request's logger by the auth preHandler, NOT read off
  // `req.user` in the serializer. Fastify writes its "incoming request" line at
  // onRequest, before auth has run, so the serializer sees a null user every
  // time. This test failed exactly that way first.
  it('carries user_id once the request has authenticated', async () => {
    const app = await buildAppWithCapturedLogs();
    const res = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    await app.close();

    const withUser = capture.lines.filter((l) => l.user_id !== undefined && l.user_id !== null);
    expect(withUser.length).toBeGreaterThan(0);
    expect(withUser[0]?.user_id).toBe(testUserId);
  });

  // The other half: an unauthenticated request must not inherit anyone's id.
  it('does not attach a user_id to an unauthenticated request', async () => {
    const app = await buildAppWithCapturedLogs();
    await app.inject({ method: 'GET', url: '/api/pets' });
    await app.close();

    const withUser = capture.lines.filter((l) => l.user_id !== undefined && l.user_id !== null);
    expect(withUser).toHaveLength(0);
  });

  it('carries res.url, so a per-route p95 is a group-by and not a stream join', async () => {
    const app = await buildAppWithCapturedLogs();
    await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    await app.close();

    const completions = capture.lines.filter((l) => (l.res as { url?: unknown } | undefined)?.url !== undefined);
    expect(completions.length).toBeGreaterThan(0);
    // Read through an optional type rather than casting and dereferencing.
    // `(completions[0]?.res as { url: string }).url` throws a TypeError when
    // the array is empty, which turns a clean assertion failure into a crash
    // that hides which assertion failed.
    const firstRes = completions[0]?.res as { url?: string } | undefined;
    expect(firstRes?.url).toBe('/api/pets');
  });

  it('never carries the Authorization header', async () => {
    const app = await buildAppWithCapturedLogs();
    await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    await app.close();

    const all = capture.raw.join('\n');
    expect(all).not.toContain('Bearer ');
  });

  it('leaves an unauthenticated request with a null user_id rather than a crash', async () => {
    const app = await buildAppWithCapturedLogs();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBeLessThan(500);
    await app.close();
    expect(capture.lines.length).toBeGreaterThan(0);
  });
});

describe('redaction', () => {
  it('censors a forbidden key at the top level', async () => {
    const app = await buildAppWithCapturedLogs();
    app.log.info({ merchant_name: 'Chase Sapphire Preferred' }, 'test line');
    await app.close();

    const all = capture.raw.join('\n');
    expect(all).not.toContain('Chase Sapphire Preferred');
    expect(all).toContain('[redacted]');
  });

  it('censors a forbidden key one and two levels down, which is where payloads actually sit', async () => {
    const app = await buildAppWithCapturedLogs();
    app.log.info({ item: { institution_name: 'Chase Sapphire Preferred' } }, 'nested one');
    app.log.info({ outer: { inner: { email: 'user@example.com' } } }, 'nested two');
    await app.close();

    const all = capture.raw.join('\n');
    expect(all).not.toContain('Chase Sapphire Preferred');
    expect(all).not.toContain('user@example.com');
  });

  it('censors credentials, amounts and provider subs', async () => {
    const app = await buildAppWithCapturedLogs();
    app.log.info(
      {
        access_token: 'access-sandbox-must-not-log',
        sub: '001234.abcdef0123456789.0000',
        amount: '4821.55',
      },
      'credentials line',
    );
    await app.close();

    const all = capture.raw.join('\n');
    for (const forbidden of FORBIDDEN) {
      expect(all, `leaked: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('keeps the identifiers that are supposed to be there', async () => {
    const app = await buildAppWithCapturedLogs();
    app.log.info({ user_id: 'u_1', item_id: 'item_1', transaction_id: 'txn_1' }, 'identifiers line');
    await app.close();

    const all = capture.raw.join('\n');
    expect(all).toContain('item_1');
    expect(all).toContain('txn_1');
  });
});

describe('error serialisation', () => {
  // The leak redaction cannot reach: it lives inside a string value, not under
  // a key. PlaidApiError builds its message from the vendor's error_message.
  it('does not log a vendor error_message, only its code', async () => {
    const { PlaidApiError } = await import('../src/plaid/types.js');
    const app = await buildAppWithCapturedLogs();

    const err = new PlaidApiError(400, {
      error_type: 'ITEM_ERROR',
      error_code: 'ITEM_LOGIN_REQUIRED',
      error_message: 'the login details for Chase Sapphire Preferred are no longer valid, balance 4821.55',
      display_message: null,
      request_id: 'req_test',
    });
    expect(err.message).toContain('Chase Sapphire Preferred');

    app.log.error({ err }, 'vendor call failed');
    await app.close();

    const all = capture.raw.join('\n');
    expect(all).not.toContain('Chase Sapphire Preferred');
    expect(all).not.toContain('4821.55');
    // The part a human can act on survives.
    expect(all).toContain('ITEM_LOGIN_REQUIRED');
  });

  it('keeps the stack, which is our code rather than the vendor prose', async () => {
    const app = await buildAppWithCapturedLogs();
    app.log.error({ err: new Error('plain failure') }, 'boom');
    await app.close();

    const all = capture.raw.join('\n');
    expect(all).toContain('stack');
    expect(all).not.toContain('plain failure');
  });

  it('survives a non-Error thrown value without crashing the logger', async () => {
    const app = await buildAppWithCapturedLogs();
    app.log.error({ err: 'a bare string' }, 'weird throw');
    await app.close();
    expect(capture.raw.join('\n')).not.toContain('a bare string');
  });
});
