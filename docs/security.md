# Coiny — Security Model

## Threat Model

Coiny handles financial data via Teller and (later) Plaid. The device itself
never sees bank credentials or transaction details — only rendering commands.
The phone app holds bank tokens. The backend holds the rules and history.

**Worst-case impact of compromise per component:**

| Component | If compromised, attacker gets... |
|---|---|
| Coiny device | Ability to make the device display a happy/sad face. No financial impact |
| Mobile app | User's Teller access token → can read transaction history |
| Backend | Multiple users' transaction history, pet state, push tokens |
| Teller/Plaid account | All connected users' bank data |

This is why **backend + mobile = high-trust**, **device = low-trust**.

---

## Already Implemented / Specified

These appear in `architecture.md` and elsewhere:

- Bank credentials never touch the device (Teller OAuth runs entirely in mobile app)
- `.env` gitignored at all directory depths (`**/.env`, `**/.env.*`)
- BLE pairing via numeric comparison (6-digit confirmation)
- All backend traffic over TLS 1.3
- Transaction data never stored on device — only the resulting command
- Device certificate stored in ESP32 secure flash (eFuse)

---

## MVP-Critical (Phase 1)

These must be in place before the backend accepts even sandbox webhooks. They
are cheap to add now and expensive to retrofit.

### 1. Teller webhook signature verification

Every Teller webhook is signed with HMAC-SHA256 using `TELLER_SIGNING_SECRET`.
**Verify the signature on every webhook before processing.** Without this,
anyone who knows the webhook URL can POST fake transactions.

```ts
// Pseudo-code in webhook handler
const signature = req.headers['teller-signature'];
const computed = hmacSha256(req.rawBody, process.env.TELLER_SIGNING_SECRET);
if (!timingSafeEqual(signature, computed)) return res.status(401).end();
```

Use `crypto.timingSafeEqual` — not `===` — to prevent timing attacks.

### 2. Webhook rate limiting

Even with signature verification, rate-limit the endpoint to prevent DOS.
Recommended: 100 req/sec per IP, 1000 req/sec total.

### 3. Mobile token storage — Keychain/Keystore only

Teller access tokens must be stored via `expo-secure-store`, which wraps
iOS Keychain and Android Keystore. **Never** `AsyncStorage` — that's plain
text and survives device backups.

### 4. Push notification content hygiene

Apple (APNs) and Google (FCM) can read every push payload. Never include in
push notifications:
- Transaction amounts
- Merchant names
- Account numbers
- Email addresses
- Bank names

Send only generic event types (`{"reaction": "happy", "eventId": "abc123"}`).
The app fetches details from the backend if needed.

---

## Pre-Beta (Phase 4)

Before any real user connects a real bank account.

### 5. BLE command authentication (app-layer HMAC)

BLE pairing alone only proves "this device paired with that phone once."
It does NOT prove "this specific command came from the paired phone."

Add an application-layer HMAC on every BLE command:
1. During pairing, derive a shared secret (HKDF from BLE long-term key, or
   exchange a random 256-bit key)
2. Store the shared secret in ESP32 secure flash
3. Every BLE command includes `{payload, nonce, hmac}` where
   `hmac = HMAC-SHA256(secret, payload || nonce)`
4. Device rejects any command with bad HMAC or replayed nonce

Without this, an attacker within ~10m can write to `coiny-cmd` and trigger
reactions. Low-impact attack but unprofessional.

### 6. ESP32 secure boot + flash encryption

ESP32-S3 supports both. Enable on production firmware builds:
- **Secure boot**: device only runs firmware signed with the private key
  whose public key is burned into eFuse
- **Flash encryption**: firmware on flash is AES-encrypted; only the device
  itself can decrypt

Cheap to enable, infinite cost to add retroactively (requires factory recall
or remote firmware reflash with new bootloader).

### 7. Disable JTAG/UART debug in production firmware

ESP-IDF builds default to debug-enabled. Production builds must explicitly
disable. Otherwise anyone with physical access has full RAM/flash access.

### 8. Signed OTA firmware updates

Current plan (`docs/architecture.md`) mentions SHA256 verification of OTA
binaries. Upgrade to **ECDSA signed firmware**:
- Generate ECDSA P-256 keypair
- Burn public key into eFuse during manufacturing
- Sign every firmware release with private key (offline, on hardware key)
- Device verifies signature before flashing

SHA256 alone proves integrity but not authenticity — an attacker who can
swap your binary can also swap the hash.

### 9. Database encryption at rest

Postgres TDE (Transparent Data Encryption). Available on Railway,
AWS RDS, GCP Cloud SQL. Turn it on for the production database.

### 10. JWT signing key rotation

Plan for rotation now even if you don't rotate often:
- Store signing keys with a key ID
- Verify tokens by looking up the key ID
- Rotate quarterly or on incident

### 11. Logging hygiene

**Never log:**
- Full transaction descriptions
- Transaction amounts
- Account IDs / Teller account tokens
- Bank names
- Email addresses (use hashed user IDs)
- Push notification tokens

**Do log:**
- Event types (`overspent_in_category`)
- Pseudonymous user IDs (UUID, not email)
- Timestamps
- HTTP status codes
- Latency metrics

### 12. Certificate pinning (mobile app)

Pin the backend's TLS certificate (or its issuer) in the Expo app. Prevents
man-in-the-middle attacks even if a CA is compromised.

---

## Pre-Production (Phase 5)

### 13. GLBA written information security program

Required by 16 CFR Part 314 (FTC Safeguards Rule):
- Risk assessment (annual)
- Designated security coordinator (named individual)
- Vendor management (Teller, Plaid, hosting, push providers)
- Employee training (just you and qiaomein at first)
- Incident response plan (written before incident, not after)
- Annual review and update

Budget: $15K–30K for fintech attorney to draft initial program.

### 14. Privacy policy + Terms of Service

Required in-app and on website before linking real bank accounts. Must
disclose:
- What data you collect (transactions, balances, account types)
- Who you share it with (Teller, Plaid, push providers, hosting)
- Retention periods
- User rights (access, deletion — GDPR/CCPA)
- Breach notification process

### 15. Account 2FA

For user accounts that link bank data:
- TOTP (preferred) via authenticator app
- SMS fallback (acknowledged weaker but better than nothing)
- Required for account recovery, optional for normal login

### 16. Incident response plan

Written before incident:
- Detection: monitoring alerts, user reports
- Containment: kill switches for Teller, push, BLE
- Eradication: patch, rotate credentials
- Recovery: restore from backup, notify users
- Post-mortem: blameless, documented

FTC requires breach notification within 30 days for qualifying incidents
(>500 users affected).

### 17. Backup encryption + access controls

- Encrypted backups (server-side encryption via cloud provider)
- Access controls (only on-call engineer can restore)
- Tested restore quarterly
- Off-site backup copy (different region)

---

## Defense in Depth (Nice to Have)

These add resilience but aren't blockers for any phase.

- **Subresource Integrity (SRI)** for any third-party JS loaded in the app or web
- **Content Security Policy (CSP)** headers on any web property
- **HSTS preload** for the backend domain
- **DMARC/DKIM/SPF** for the email-sending domain
- **Dependency scanning** in CI (Dependabot, Renovate, Snyk)
- **Static analysis** (TypeScript strict mode, Semgrep, ESLint security plugin)
- **Penetration test** before production launch (~$5K–15K from a security firm)
- **Bug bounty program** (HackerOne or similar) post-launch

---

## Security Review Checklist by Phase

### Before Phase 1 deploys
- [ ] Teller signing secret in env, not code
- [ ] Webhook signature verification implemented
- [ ] Webhook rate limiting in place
- [ ] No PII in logs

### Before Phase 3 ships to TestFlight
- [ ] `expo-secure-store` for all auth tokens
- [ ] Push payloads contain only event IDs
- [ ] Backend traffic over TLS 1.3

### Before Phase 4 (real bank data)
- [ ] BLE command HMAC authentication
- [ ] ESP32 secure boot + flash encryption enabled
- [ ] JTAG/UART debug disabled in production firmware
- [ ] Signed OTA updates with ECDSA
- [ ] Database TDE enabled
- [ ] Logging hygiene audited
- [ ] Certificate pinning in mobile app
- [ ] JWT key rotation plan documented

### Before Phase 5 (beta users)
- [ ] GLBA written information security program complete
- [ ] Privacy policy + ToS published
- [ ] 2FA available for user accounts
- [ ] Incident response plan written
- [ ] Encrypted backups + tested restore
- [ ] Penetration test completed
