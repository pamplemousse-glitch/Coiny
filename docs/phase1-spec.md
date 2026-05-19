# Phase 1 — Backend Scaffold Spec

Single source of truth for what Phase 1 must deliver. Read this first when
starting Phase 1 work.

---

## Goal

A backend that receives Teller sandbox webhooks, evaluates them against a
rule engine, and prints reactions to the terminal via a simulator. No
hardware, no mobile app, no real bank data.

**Done test**:
```
$ pnpm dev                 # backend starts on :3000
$ pnpm sim overspend       # simulator fires fake transaction
# Terminal prints:
# → Coiny is sad — overspent in groceries
```

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node 22+ |
| Language | TypeScript (strict mode) |
| Framework | Fastify 4.x |
| Schema validation | Zod (runtime + inferred types) |
| HTTP client | Native `fetch` + `https.Agent` for mTLS |
| Logger | pino (Fastify default) |
| Tests | Vitest |
| Dev runner | tsx |
| Package manager | pnpm (workspaces) |
| Build tool | Turborepo (already configured) |

---

## Directory Layout

```
backend/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example                       (committed; documents env contract)
├── src/
│   ├── server.ts                      Fastify bootstrap
│   ├── config.ts                      Reads env, validates with Zod
│   ├── plugins/
│   │   ├── logger.ts                  pino config
│   │   └── error-handler.ts           Centralized error responses
│   ├── teller/
│   │   ├── client.ts                  mTLS-authenticated REST client
│   │   ├── types.ts                   Zod schemas for Teller payloads
│   │   └── signature.ts               HMAC-SHA256 webhook verification
│   ├── webhook/
│   │   └── teller.ts                  POST /webhooks/teller handler
│   ├── rules/
│   │   ├── engine.ts                  Evaluates transaction → reaction
│   │   └── definitions.ts             Rule set (paycheck, overspend, etc.)
│   ├── reactions/
│   │   ├── types.ts                   BLE command shape (matches shared/)
│   │   └── dispatch.ts                Stub: prints to terminal (Phase 1)
│   └── sim/
│       └── cli.ts                     `pnpm sim <event>` CLI entrypoint
└── tests/
    ├── signature.test.ts
    ├── rules.test.ts
    └── webhook.test.ts

bin/
└── load-secrets.sh                    Reads from macOS Keychain → env vars
```

---

## Secrets Loading

Local dev secrets live in **macOS Keychain**, NOT in `.env` files. The
loader script wraps `security find-generic-password` and exports values
as env vars before starting the server.

```bash
#!/usr/bin/env bash
# bin/load-secrets.sh — source this before pnpm dev

set -e
export TELLER_APPLICATION_ID=$(security find-generic-password -a "$USER" -s "coiny-teller-application-id" -w)
export TELLER_SIGNING_SECRET=$(security find-generic-password -a "$USER" -s "coiny-teller-signing-secret" -w 2>/dev/null || echo "")
export TELLER_CERT_PATH="$HOME/Documents/coiny-secrets/teller-sandbox/certificate.pem"
export TELLER_KEY_PATH="$HOME/Documents/coiny-secrets/teller-sandbox/private_key.pem"
export TELLER_ENVIRONMENT=sandbox
```

Usage: `source bin/load-secrets.sh && pnpm dev`

The signing secret is `2>/dev/null || echo ""` because the user hasn't
generated one yet (no webhook configured). Phase 1 webhook handler should
gracefully no-op signature verification when the secret is empty AND log
a clear warning. Phase 2 (or whenever webhooks are configured) the secret
becomes mandatory.

---

## Teller Client (mTLS)

Teller authenticates via mutual TLS, not an API key. Use Node's native
`https.Agent` with the cert + key:

```ts
import { readFileSync } from 'node:fs';
import { Agent } from 'undici';

const agent = new Agent({
  connect: {
    cert: readFileSync(process.env.TELLER_CERT_PATH!),
    key: readFileSync(process.env.TELLER_KEY_PATH!),
  },
});

export async function tellerGet(path: string, accessToken: string) {
  const res = await fetch(`https://api.teller.io${path}`, {
    dispatcher: agent,
    headers: { Authorization: `Basic ${Buffer.from(accessToken + ':').toString('base64')}` },
  });
  if (!res.ok) throw new Error(`Teller ${res.status}: ${await res.text()}`);
  return res.json();
}
```

Access tokens (per-user enrollment tokens like `test_token_qt55yrh7nlrd2`)
are passed in as Basic Auth username with empty password. These come from
Teller Connect on the mobile side; in Phase 1, hardcode the sandbox token
from Keychain for testing.

---

## Webhook Handler

```
POST /webhooks/teller
```

Receives Teller's `transactions.processed`, `enrollment.disconnected`,
`account.number_verification.processed`, and `webhook.test` events.

**Required behavior:**

1. Read raw body before JSON parsing (signature is HMAC of raw body)
2. Parse `Teller-Signature: t=<timestamp>,v1=<sig>` header
3. Reject if timestamp >3 minutes old (replay protection)
4. Compute HMAC-SHA256 of `<timestamp>.<raw_body>` with `TELLER_SIGNING_SECRET`
5. Compare with `crypto.timingSafeEqual` — NOT `===`
6. If signature valid (or secret not yet configured + warn-mode):
   - Parse body via Zod
   - For each transaction in payload, hand to rule engine
   - Rule engine produces a reaction
   - Dispatch reaction (Phase 1 = print to terminal)
7. Return 200 OK quickly; do heavy work async

**Rate limiting**: 100 req/sec per IP via `@fastify/rate-limit`.

---

## Rule Engine (Phase 1 — minimal)

Five events to start. Each rule takes a transaction + (later) user goals
and returns a reaction or null.

| Event | Trigger | Reaction |
|---|---|---|
| `paycheck_received` | Credit > $500 to checking | `celebrate` + `fanfare` + `rainbow` LED |
| `overspent_in_category` | Spending in category > weekly budget | `sad` + `warning` + `amber` LED |
| `savings_milestone` | Savings account balance crosses 25/50/100% of goal | `happy` + `chime` + `green` LED |
| `bill_paid_on_time` | Outgoing transfer to known biller before due date | `happy` + `coin` + `green` LED |
| `large_purchase` | Single transaction > $200 | `concerned` + `warning` + `amber` LED |

For Phase 1, **hardcode user goals as constants**. Real goal configuration
comes in Phase 3 (mobile app).

Reaction shape (matches BLE command schema in `docs/mqtt-topics.md`):

```ts
type Reaction = {
  animation: 'happy' | 'sad' | 'celebrate' | 'concerned' | 'neutral' | 'sleeping';
  sound:     'chime' | 'fanfare' | 'warning' | 'coin' | 'off';
  led:       'green' | 'amber' | 'red' | 'rainbow' | 'off';
  duration:  number;  // ms; 0 = hold until next
};
```

---

## Simulator CLI

```
pnpm sim paycheck
pnpm sim overspend
pnpm sim savings-milestone
pnpm sim large-purchase
```

Each command synthesizes a fake `transactions.processed` payload, POSTs it
to the local `/webhooks/teller` (with a properly-signed header if secret is
configured), and the server prints the resulting reaction:

```
🐣 Coiny reacted:
   animation: celebrate
   sound:     fanfare
   led:       rainbow
   duration:  3000 ms
   reason:    paycheck_received (Direct Deposit $2,400.00)
```

The simulator is also the way you'd integration-test the full pipeline
without needing a real Teller webhook fired.

---

## Tests (Vitest)

Minimum coverage to call Phase 1 done:

| Test | Asserts |
|---|---|
| `signature.test.ts` | HMAC verification accepts valid sig; rejects bad sig; rejects old timestamp |
| `rules.test.ts` | Each rule fires on matching input; doesn't fire on non-matching |
| `webhook.test.ts` | Webhook 200s on signed payload; 401s on bad sig; calls rule engine |

No DB tests in Phase 1 (using in-memory state).

---

## Security Checklist (Phase 1 cutover)

From `docs/security.md` — these must be true before Phase 1 ships:

- [ ] Teller webhook signature verification implemented (or warn-mode if no secret yet)
- [ ] `crypto.timingSafeEqual` used (not `===`)
- [ ] Timestamps >3 min rejected
- [ ] Rate limiting on webhook endpoint
- [ ] No PII in logs (only event types + pseudonymous IDs)
- [ ] TLS cert + private key read from filesystem, never logged
- [ ] `.env`, `*.pem`, `~/Documents/coiny-secrets/` all gitignored

---

## Non-Goals (explicitly NOT in Phase 1)

- Database persistence (in-memory state is fine; Postgres comes when needed)
- User accounts / authentication / authorization
- Multi-tenant rule storage (rules are constants for now)
- Production hosting (localhost only)
- BLE / mobile / firmware code (separate phases)
- Real bank data (sandbox only)
- Plaid integration (deferred)
- OTA endpoint (Phase 5)
- Frontend / admin UI

---

## Definition of Done

```bash
$ source bin/load-secrets.sh
$ pnpm dev
# Server starts on :3000, logs "Coiny backend ready"

# In a second terminal:
$ pnpm sim paycheck
🐣 Coiny reacted: celebrate + fanfare + rainbow LED (3000ms)

$ pnpm sim overspend
🐣 Coiny reacted: sad + warning + amber LED (2000ms)

$ pnpm test
# All Vitest tests pass

$ curl -X POST http://localhost:3000/webhooks/teller \
       -H "Teller-Signature: t=<now>,v1=<sig>" \
       -H "Content-Type: application/json" \
       -d '<payload>'
# 200 OK, reaction printed in server logs
```

When all of the above is true, Phase 1 is done and Phase 2 (firmware) can start.
