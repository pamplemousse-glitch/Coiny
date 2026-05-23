---
description: Security rules for backend source code — loaded whenever editing backend/src files
paths:
  - "backend/src/**"
  - "backend/tests/**"
---

# Security Rules (NEVER VIOLATE)

1. **No secrets in code.** No hardcoded tokens, keys, or credentials — ever. Secrets come from `config.ts` which reads from env (loaded via `bin/load-secrets.sh` from macOS Keychain in dev, Fly secrets in prod).

2. **No PII in logs.** Log `transaction_id`, `item_id`, `user_id` (pseudonymous). Never log merchant names, amounts, emails, or Apple `sub` values.

3. **Plaid webhook HMAC is mandatory.** Every handler in `src/webhook/plaid.ts` must verify the JWT signature (ES256 via Apple JWKS) AND `request_body_sha256` against the raw body before processing.

4. **AES-256-GCM for sensitive DB fields.** Plaid `access_token` is encrypted via `encryptToken()` in `src/store/items.ts`. Any new field storing PII or financial data needs the same treatment. Never store plaintext tokens.

5. **All routes behind auth except `/health` and `/webhooks/plaid`.** The three-scope server in `src/server.ts`: unauthenticated, public (`/api/auth/*`), protected (everything else). New routes go in the protected scope unless explicitly unauthenticated.

6. **BOLA/IDOR prevention.** Every store function is scoped by `userId`. Never fetch or mutate a resource without checking `WHERE user_id = $userId`. No route should return another user's data.

7. **No new dependencies without justification.** Each package is a supply-chain risk. Prefer Node built-ins (`node:crypto`, `node:https`).
