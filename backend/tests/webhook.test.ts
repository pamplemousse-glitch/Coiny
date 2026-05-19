import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';

// Must set env before importing server modules that call loadConfig() at module init.
process.env['TELLER_APPLICATION_ID'] = 'app_test';
process.env['TELLER_CERT_PATH'] = '/dev/null';
process.env['TELLER_KEY_PATH'] = '/dev/null';
process.env['TELLER_SIGNING_SECRET'] = 'test-webhook-secret';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

const SECRET = 'test-webhook-secret';

function buildSignature(body: string, ts: number): string {
  const sig = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

const PAYCHECK_PAYLOAD = JSON.stringify({
  id: 'evt_wh_test',
  type: 'transactions.processed',
  payload: {
    account_id: 'acc_test',
    transactions: [
      {
        id: 'txn_wh_paycheck',
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

describe('POST /webhooks/teller', () => {
  it('returns 200 on a valid signed payload', async () => {
    // Lazy-import after env setup.
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const ts = Math.floor(Date.now() / 1000);
    const sig = buildSignature(PAYCHECK_PAYLOAD, ts);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/teller',
      headers: {
        'content-type': 'application/json',
        'teller-signature': sig,
      },
      body: PAYCHECK_PAYLOAD,
    });

    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('returns 401 on a bad signature', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const ts = Math.floor(Date.now() / 1000);
    const badSig = `t=${ts},v1=deadbeef${'0'.repeat(60)}`;

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/teller',
      headers: {
        'content-type': 'application/json',
        'teller-signature': badSig,
      },
      body: PAYCHECK_PAYLOAD,
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('calls the rule engine and dispatches for valid transactions', async () => {
    const dispatchModule = await import('../src/reactions/dispatch.js');
    const spy = vi.spyOn(dispatchModule, 'dispatchReaction');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const ts = Math.floor(Date.now() / 1000);
    const sig = buildSignature(PAYCHECK_PAYLOAD, ts);

    await app.inject({
      method: 'POST',
      url: '/webhooks/teller',
      headers: {
        'content-type': 'application/json',
        'teller-signature': sig,
      },
      body: PAYCHECK_PAYLOAD,
    });

    // setImmediate fires async — wait a tick
    await new Promise((r) => setImmediate(r));

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]?.animation).toBe('celebrate');

    await app.close();
  });
});
