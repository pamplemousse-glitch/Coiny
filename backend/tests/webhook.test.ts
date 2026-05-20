import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { resetDatabase } from './db-helper.js';

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));

// Webhook handler awaits async store ops inside setImmediate; one flush isn't
// always enough since each awaited microtask defers further work.
async function flushAll() {
  for (let i = 0; i < 5; i++) await flushImmediate();
}

process.env['TELLER_SIGNING_SECRET'] = 'test-webhook-secret';

const SECRET = 'test-webhook-secret';

function buildSignature(body: string, ts: number): string {
  const sig = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

function buildPaycheckPayload(id: string): string {
  return JSON.stringify({
    id,
    type: 'transactions.processed',
    payload: {
      account_id: 'acc_test',
      transactions: [
        {
          id: `txn_${id}`,
          account_id: 'acc_test',
          amount: '2400.00',
          date: '2026-05-19',
          description: 'Direct Deposit',
          details: { category: 'paycheck' },
          running_balance: null,
          status: 'posted',
          type: 'paycheck',
        },
      ],
    },
  });
}

describe('POST /webhooks/teller', () => {
  beforeEach(async () => { await resetDatabase(); });

  it('returns 200 on a valid signed payload', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const payload = buildPaycheckPayload('evt_wh_200');
    const ts = Math.floor(Date.now() / 1000);
    const sig = buildSignature(payload, ts);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/teller',
      headers: { 'content-type': 'application/json', 'teller-signature': sig },
      body: payload,
    });

    expect(res.statusCode).toBe(200);
    await flushAll();
    await app.close();
  });

  it('returns 401 on a bad signature', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const payload = buildPaycheckPayload('evt_wh_401');
    const ts = Math.floor(Date.now() / 1000);
    const badSig = `t=${ts},v1=deadbeef${'0'.repeat(60)}`;

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/teller',
      headers: { 'content-type': 'application/json', 'teller-signature': badSig },
      body: payload,
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('calls the rule engine and dispatches for valid transactions', async () => {
    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const payload = buildPaycheckPayload('evt_wh_dispatch');
    const ts = Math.floor(Date.now() / 1000);
    const sig = buildSignature(payload, ts);

    await app.inject({
      method: 'POST',
      url: '/webhooks/teller',
      headers: { 'content-type': 'application/json', 'teller-signature': sig },
      body: payload,
    });

    await flushAll();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]?.animation).toBe('celebrate');

    await app.close();
  });

  it('does not dispatch the same event twice (idempotency)', async () => {
    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');
    spy.mockClear();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const payload = buildPaycheckPayload('evt_wh_idem');
    const ts = Math.floor(Date.now() / 1000);
    const sig = buildSignature(payload, ts);
    const opts = {
      method: 'POST' as const,
      url: '/webhooks/teller',
      headers: { 'content-type': 'application/json', 'teller-signature': sig },
      body: payload,
    };

    // Serial requests — concurrent would race the insert-then-check pattern,
    // which we don't claim to handle (a unique constraint on processed_events.id
    // is what guarantees no double-processing in production).
    const r1 = await app.inject(opts);
    await flushAll();
    const r2 = await app.inject(opts);
    await flushAll();

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledOnce();

    await app.close();
  });
});
