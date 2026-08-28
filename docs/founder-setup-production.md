# Standing up production, step by step

Written 2026-08-28. Every step here is **[Founder]**: accounts only you can
touch. Verified against `fly.toml`, `fly.production.toml`,
`.github/workflows/backend-deploy.yml` and `src/config.ts` on the day it was
written, not reconstructed from memory.

**Why this file exists.** The steps were previously spread across
`handoff-2026-08-21.md` §3 and `environments-setup.md`, and the latter's Phase I
was WRONG for eight days in a way that would have converted staging into
production. See the correction table at the top of that file. This is the
consolidated, checked version.

State when written: `coiny-api` does not exist. `coiny-backend` (staging) does.

---

## Part 1: Apple Sign In keys (~15 min, do this first)

Independent of everything else, and it is the App Review **rejection** risk:
without these, account deletion cannot revoke the Apple grant, which TN3194
requires.

1. developer.apple.com → Certificates, IDs & Profiles → **Keys** → **+**
2. Name it `Coiny Sign in with Apple`. Tick **Sign in with Apple**. Configure,
   choose primary App ID `app.coiny.ios`. Continue, Register.
3. **Download the `.p8`. You get exactly one download, ever.** Note the **Key
   ID** (10 characters) shown on that page.
4. Set them on STAGING first, so the flow can be tested before production
   exists:

```bash
fly secrets set -a coiny-backend APPLE_TEAM_ID=UKL98DS9D3
fly secrets set -a coiny-backend APPLE_SIGN_IN_KEY_ID=<the 10-char key id>
# The .p8 is multiline, so `import` rather than `set`: `set` would put the
# private key into shell history.
fly secrets import -a coiny-backend
# paste:  APPLE_SIGN_IN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
# then Ctrl-D
```

The three names are exactly what `src/apple/client.ts:56` checks for.

---

## Part 2: The production backend (~45 min)

**Three traps, all of which the docs previously got wrong. Do not improvise
around them.**

### 1. Create the app

```bash
fly apps create coiny-api
```

### 2. A production Neon branch

The existing branch named `production` is the May-2026 dev branch. If you reuse
it, **drop BOTH schemas**:

```sql
DROP SCHEMA public CASCADE; CREATE SCHEMA public;
DROP SCHEMA drizzle CASCADE;
```

**Dropping only `public` is the trap.** It leaves
`drizzle.__drizzle_migrations`, so the migrator believes every migration has
already run, skips all of them **silently**, and production comes up with no
`users` table and no error.

### 3. Secrets on `coiny-api`

```bash
openssl rand -hex 32        # a NEW key. Do NOT reuse staging's.
fly secrets set -a coiny-api DATABASE_URL=... DATA_ENCRYPTION_KEY=...
fly secrets set -a coiny-api PLAID_CLIENT_ID=... PLAID_SECRET=...   # PRODUCTION Plaid
fly secrets set -a coiny-api APPLE_TEAM_ID=UKL98DS9D3 APPLE_SIGN_IN_KEY_ID=...
fly secrets import -a coiny-api      # APPLE_SIGN_IN_PRIVATE_KEY
fly secrets set -a coiny-api APNS_KEY_ID=... APNS_TEAM_ID=...
fly secrets import -a coiny-api      # APNS_KEY, also a .p8
```

**Never put production Plaid secrets on `coiny-backend`, and never flip
`fly.toml` to `APP_ENV = 'production'`.** That converts staging into
production, which is the exact mislabelling that was fixed in #317. The mapping
is already correct in the repo and should stay that way:

| File | App | Environment |
|---|---|---|
| `fly.toml` | `coiny-backend` | staging |
| `fly.production.toml` | `coiny-api` | production |

### 4. Deploy

From the **repo root**, where both toml files live:

```bash
fly deploy -c fly.production.toml
curl -fsS https://coiny-api.fly.dev/health
```

### 5. CI auto-deploy

Add a GitHub Actions secret named **exactly** `FLY_API_TOKEN_PRODUCTION`.
`backend-deploy.yml:103` reads that name; a secret called `FLY_API_TOKEN` is
not read and the deploy fails.

---

## Part 3: Onto your phone (~20 min)

1. Archive a **Release** build. Debug builds and plain `xcodebuild` point at
   staging on purpose: the failure mode of forgetting to opt in is fake data,
   never someone's real accounts.
2. TestFlight and device installs work on the **Individual** membership. The
   Organization enrollment (G1.1) gates App Store **submission** only. Do not
   wait on it to test on your own phone.
3. **Linking a real bank spends 1 of 10 Plaid Trial Items, permanently.**
   Removing the item does not return the slot.

---

## Two things to check by hand once it is on the phone

Neither is observable in the simulator, and both shipped in #330:

- Background the app for six minutes, return, confirm it asks for Face ID.
- Open the app switcher and confirm the snapshot shows the curtain rather than
  your net worth. That is the entire reason the overlay exists.

---

## Still unset after all of this

`RENTCAST_API_KEY`, `MARKETCHECK_API_KEY`, `TONCENTER_API_KEY`,
`GOOGLE_AUTH_CLIENT_ID`. Each has an integration built behind it that throws
without the key. None blocks a first device install.

Note `RENTCAST` and `MARKETCHECK` have no sandbox or free tier, so they cannot
be set up before paying; that is a known gap, not an oversight.
