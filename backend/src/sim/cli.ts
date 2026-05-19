import { buildSignatureHeader } from '../teller/signature.js';

type EventName = 'paycheck' | 'overspend' | 'savings-milestone' | 'large-purchase' | 'bill-paid';

const EVENTS: Record<EventName, object> = {
  paycheck: {
    id: 'evt_sim_paycheck',
    type: 'transactions.processed',
    payload: {
      account_id: 'acc_sim_checking',
      transactions: [
        {
          id: 'txn_sim_paycheck',
          account_id: 'acc_sim_checking',
          amount: '2400.00',
          date: new Date().toISOString().split('T')[0],
          description: 'Direct Deposit EMPLOYER NAME',
          details: { category: 'paycheck', counterparty: { name: 'Employer', type: 'organization' } },
          running_balance: null,
          status: 'posted',
          type: 'paycheck',
        },
      ],
    },
  },

  overspend: {
    id: 'evt_sim_overspend',
    type: 'transactions.processed',
    payload: {
      account_id: 'acc_sim_checking',
      transactions: [
        {
          id: 'txn_sim_overspend',
          account_id: 'acc_sim_checking',
          amount: '-185.00',
          date: new Date().toISOString().split('T')[0],
          description: 'WHOLE FOODS MARKET',
          details: { category: 'groceries', counterparty: { name: 'Whole Foods Market', type: 'organization' } },
          running_balance: null,
          status: 'posted',
          type: 'card_payment',
        },
      ],
    },
  },

  'savings-milestone': {
    id: 'evt_sim_savings',
    type: 'transactions.processed',
    payload: {
      account_id: 'acc_sim_savings',
      transactions: [
        {
          id: 'txn_sim_savings',
          account_id: 'acc_sim_savings',
          amount: '50.00',
          date: new Date().toISOString().split('T')[0],
          description: 'Transfer to savings',
          details: { category: 'transfer', counterparty: { name: 'Self', type: 'person' } },
          running_balance: '260.00',
          status: 'posted',
          type: 'transfer',
        },
      ],
    },
  },

  'large-purchase': {
    id: 'evt_sim_large',
    type: 'transactions.processed',
    payload: {
      account_id: 'acc_sim_checking',
      transactions: [
        {
          id: 'txn_sim_large',
          account_id: 'acc_sim_checking',
          amount: '-349.99',
          date: new Date().toISOString().split('T')[0],
          description: 'APPLE STORE',
          details: { category: 'electronics', counterparty: { name: 'Apple Store', type: 'organization' } },
          running_balance: null,
          status: 'posted',
          type: 'card_payment',
        },
      ],
    },
  },

  'bill-paid': {
    id: 'evt_sim_bill',
    type: 'transactions.processed',
    payload: {
      account_id: 'acc_sim_checking',
      transactions: [
        {
          id: 'txn_sim_bill',
          account_id: 'acc_sim_checking',
          amount: '-89.99',
          date: new Date().toISOString().split('T')[0],
          description: 'AT&T INTERNET',
          details: { category: 'utilities', counterparty: { name: 'internet provider', type: 'organization' } },
          running_balance: null,
          status: 'posted',
          type: 'ach',
        },
      ],
    },
  },
};

async function main() {
  const eventArg = process.argv[2];

  if (!eventArg || !(eventArg in EVENTS)) {
    console.error(`Usage: pnpm sim <event>`);
    console.error(`Events: ${Object.keys(EVENTS).join(' | ')}`);
    process.exit(1);
  }

  const eventName = eventArg as EventName;
  const body = JSON.stringify(EVENTS[eventName]);
  const bodyBuf = Buffer.from(body, 'utf8');
  const secret = process.env['TELLER_SIGNING_SECRET'] ?? '';
  const port = process.env['PORT'] ?? '3000';

  const signatureHeader = secret
    ? buildSignatureHeader(bodyBuf, secret)
    : `t=${Math.floor(Date.now() / 1000)},v1=nosecret`;

  let res;
  try {
    res = await fetch(`http://localhost:${port}/webhooks/teller`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Teller-Signature': signatureHeader,
        'Content-Length': String(bodyBuf.length),
      },
      body,
    });
  } catch {
    console.error(`\n✗ Could not reach server at http://localhost:${port}/webhooks/teller`);
    console.error(`  Make sure the server is running: source bin/load-secrets.sh && pnpm dev\n`);
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`\n✗ Server returned ${res.status}: ${text}\n`);
    process.exit(1);
  }

  console.log(`\n✓ Simulated "${eventName}" — watch the server terminal for Coiny's reaction.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
