// What reaches the CLIENT when a handler throws (PRD R-31.6).
//
// There was no test for this file at all, which is why the leak below could sit
// in it unnoticed: `reply.send({ error: status >= 500 ? 'Internal Server Error'
// : error.message })` returned a thrown error's message verbatim for anything
// under 500.
//
// That was safe only by accident. PlaidApiError carries `status`, not
// `statusCode`, so Fastify defaulted it to 500 and the caller got the literal
// string "Internal Server Error". Rename that field, or throw any other vendor
// error that does carry a 4xx statusCode, and vendor prose reaches the client.
// A test that asserts the accident is not a test; these assert the rule.

import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from './db-helper.js';

let app: FastifyInstance;

beforeEach(async () => {
  await resetDatabase();
  const { buildApp } = await import('../src/server.js');
  app = await buildApp();
});

afterEach(async () => {
  await app.close();
});

/** Registers a route that throws whatever the test needs, on the running app. */
function routeThatThrows(path: string, error: Error): void {
  app.get(path, async () => {
    throw error;
  });
}

describe('what a thrown error returns to the client', () => {
  it('never returns a 5xx message', async () => {
    const err = new Error('connection to db-prod-01 refused at 10.0.0.4:5432');
    routeThatThrows('/test-error-500', err);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test-error-500' });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('db-prod-01');
    expect(res.body).not.toContain('10.0.0.4');
    expect(res.json<{ error: string }>().error).toBe('Internal Server Error');
  });

  // The regression that mattered. A 4xx used to hand the message straight back.
  it('does not return an arbitrary 4xx error message', async () => {
    const err = Object.assign(new Error('the login details for Chase Sapphire Preferred are invalid'), {
      statusCode: 400,
    });
    routeThatThrows('/test-error-400', err);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test-error-400' });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain('Chase Sapphire Preferred');
    expect(res.json<{ error: string }>().error).toBe('Request failed');
  });

  // A vendor error that DOES carry a 4xx statusCode is the case the old code
  // was one renamed field away from.
  it('does not return a vendor message carried on a 4xx statusCode', async () => {
    const { PlaidApiError } = await import('../src/plaid/types.js');
    const err = Object.assign(
      new PlaidApiError(400, {
        error_type: 'ITEM_ERROR',
        error_code: 'ITEM_LOGIN_REQUIRED',
        error_message: 'the login details for Chase Sapphire Preferred are no longer valid',
        display_message: null,
        request_id: 'req_test',
      }),
      { statusCode: 400 },
    );
    routeThatThrows('/test-error-vendor', err);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test-error-vendor' });
    expect(res.body).not.toContain('Chase Sapphire Preferred');
  });

  // The reason the rule is "only a message we wrote" and not "never a message".
  // Fastify builds validation messages from our own route schemas, and
  // "body must have required property 'goal_id'" is worth returning.
  it('still returns Fastify validation messages, which are ours', async () => {
    app.post(
      '/test-error-validation',
      {
        schema: {
          body: {
            type: 'object',
            required: ['goal_id'],
            properties: { goal_id: { type: 'string' } },
          },
        },
      },
      async () => ({ ok: true }),
    );
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/test-error-validation',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string; code?: string }>();
    expect(body.error).toContain('goal_id');
    expect(body.code).toBe('FST_ERR_VALIDATION');
  });

  it('returns the programmatic code so a client can still branch on it', async () => {
    const err = Object.assign(new Error('internal detail'), { statusCode: 409, code: 'SOME_CONFLICT' });
    routeThatThrows('/test-error-code', err);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test-error-code' });
    expect(res.statusCode).toBe(409);
    const body = res.json<{ error: string; code?: string }>();
    expect(body.error).toBe('Request failed');
    expect(body.code).toBe('SOME_CONFLICT');
    expect(res.body).not.toContain('internal detail');
  });
});
