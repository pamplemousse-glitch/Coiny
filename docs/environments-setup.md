# Environments: Setup Runbook

The "how" companion to `docs/environments-research.md` (the "why"). Work the
phases in order; each step is labelled **[Founder]** (dashboard or CLI work
on accounts only he can touch) or **[Agent]** (repo changes done in a Claude
Code session). Steps that depend on an unmade decision are marked
**DECISION** with the recommended default, so nothing here blocks.

Never paste a secret value into a terminal command that echoes it, into this
file, or into any file in the repo. Commands below either read values from
environment variables, generate them without displaying them, or prompt
interactively.

Known identifiers used throughout (safe to write down, none are secrets):

| Thing | Value |
|---|---|
| GitHub repo | `pamplemousse-glitch/Coiny` (public) |
| Fly app, production | `coiny-backend` (region `iad`) |
| Fly app, staging (to create) | `coiny-backend-stage` |
| Neon project | `Coiny`, id `noisy-bonus-65551609`, aws-us-east-1, Postgres 17 |
| Neon branch, production | `production` (default; currently NOT protected) |
| Neon branch, staging (to create) | `staging` |
| Apple team ID | `UKL98DS9D3` |
| Bundle ID | `app.coiny.ios` (one bundle ID for all environments) |

---

## 0. Lead-time items: start these today, they gate everything real

These have external review clocks that nothing in this repo can accelerate.
Everything in phases 1 to 8 proceeds without them; phase 9 (go-live) blocks
on the first two.

1. **[Founder] Plaid production access.** Plaid Dashboard >
   [Launch Center](https://dashboard.plaid.com/developers/launch-center).
   Apply for full Production access and complete the OAuth registration form
   (required for Chase, BofA, Wells Fargo connections). Until approval you
   have Limited Production at best; Sandbox is unaffected
   ([Plaid environments](https://plaid.com/docs/quickstart/glossary/)).
   Lead time: Plaid's review, plus OAuth institution registration which is
   its own queue. Start now.
2. **[Founder] Apple: App ID registration and TestFlight unblock.** Already
   on the task list (see memory note "TestFlight State"): register the App
   ID for `app.coiny.ios` under team `UKL98DS9D3` at
   developer.apple.com > Certificates, Identifiers & Profiles >
   Identifiers, with the Sign In with Apple capability. This gates any
   distributed build, staging or production alike.
3. **[Founder] TrueLayer live credentials.** TrueLayer Console: create the
   live application and complete their go-live verification. Sandbox
   credentials keep working regardless (`TRUELAYER_ENV=sandbox`,
   `backend/src/config.ts:91`). Lead time **Unverified** (docs not
   fetchable by automation); check the console for the current process.
4. **[Founder] Spinwheel production key.** Spinwheel is a B2B API; the
   sandbox host is baked into config
   (`backend/src/config.ts:50`). Production onboarding terms and lead time
   **Unverified**; contact them from the dashboard. Not launch-blocking if
   debt features ship in a later build.
5. **[Founder] Buy the domain.** **DECISION**: exact domain; default
   assumption below is `coiny.app` with `api.coiny.app` (production) and
   `api.stage.coiny.app` (staging). Any registrar; you only need DNS
   records. Fast, but it must land before the first Beta build is
   distributed, because clients bake the URL in
   (`ios/Coiny/Services/API.swift:21`).

---

## 1. Phase A: make migrations safe (the afternoon step)

Do this before merging PR #191 (45 commits, 9 migrations, auto-deploys on
merge per `.github/workflows/backend-deploy.yml`).

1. **[Agent] Add the migration CLI entrypoint.** New file
   `backend/src/db/migrate-run.ts`: calls `initDb()` then `runMigrations()`
   (both exist: `backend/src/db/client.ts`, `backend/src/db/migrate.ts`),
   logs applied-migration count, exits nonzero on failure. Compiled by the
   existing `tsc` build into `backend/dist/db/migrate-run.js`. This is used
   by both the rehearsal below and the Fly `release_command` in Phase D.
2. **[Agent] Add the journal monotonicity check.** Script
   `backend/scripts/check-journal.mjs`: reads
   `backend/drizzle/meta/_journal.json`, asserts every entry's `when` is
   strictly greater than the previous entry's and not older than the
   previous entry's date (the silent-skip trap documented in
   `backend/CLAUDE.md`). Wire it as a step in
   `.github/workflows/backend-ci.yml` and as a `pretest` convenience.
3. **[Founder or Agent] Rehearse PR #191's migrations against a disposable
   copy of the real database.** Requires `NEON_API_KEY` in the shell (from
   [Neon console](https://console.neon.tech) > Account > API keys; store it
   in Keychain via interactive `security add-generic-password -s
   coiny-neon-api-key -a coiny -w`, never inline).

   ```bash
   # From the PR branch, with the build done (pnpm --filter coiny-backend build)
   neon branches create --project-id noisy-bonus-65551609 \
     --name rehearse-pr191 --parent production \
     --expires-at "$(date -u -v+2H +%Y-%m-%dT%H:%M:%SZ)"

   # Returns a connection URI; export it without echoing:
   export DATABASE_URL="$(neon connection-string rehearse-pr191 \
     --project-id noisy-bonus-65551609)"

   # NODE_ENV=development on purpose: config validation does not demand the
   # full production secret set, and client.ts uses real Postgres whenever
   # DATABASE_URL is set (backend/src/db/client.ts:15).
   NODE_ENV=development node backend/dist/db/migrate-run.js

   # Prove the migrations actually landed (the journal-skip failure mode is
   # "no error, missing table"):
   neon psql rehearse-pr191 --project-id noisy-bonus-65551609 \
     -- -c "\dt" | grep -E "goals|debt|entitle|analytics"
   ```

   The branch self-deletes at the TTL
   ([Neon CLI branching](https://neon.com/docs/guides/branching-neon-cli)).
   Rollback: none needed, the branch is disposable and production was never
   touched.
4. **[Agent] Make the rehearsal a CI job.** New workflow
   `.github/workflows/migration-rehearsal.yml`: on PRs touching
   `backend/drizzle/**`, create a TTL branch from `production`, run
   `migrate-run.js`, assert the journal's final tag is recorded in
   `drizzle.__drizzle_migrations`, delete the branch (belt and braces on top
   of the TTL). Uses the `staging` GitHub Environment's `NEON_API_KEY`
   (Phase B). Template: [Neon branching with GitHub Actions](https://neon.com/docs/guides/branching-github-actions).
5. **[Founder] Merge PR #191** once 3 is green. It deploys to the current
   single app, which is de facto staging with an audience of one; that is
   acceptable exactly once more. Rollback: `flyctl deploy` of the previous
   image via `fly releases -a coiny-backend` + `fly deploy -i <image>`;
   database rollback via Neon instant restore (6-hour window on the Free
   plan, `docs/engineering-budgets.md` §7).

---

## 2. The secret inventory: all 44 variables

Derived from `backend/src/config.ts` (lines 5 to 108), which is the only
place the backend reads environment configuration. "toml" means the value is
non-secret and belongs in the committed Fly config `[env]` block; "Fly
secret" means set via `fly secrets set` per app. **Never put a "Fly secret"
row into a toml or into GitHub.**

Plain config (committed in the toml files, differs as shown):

| Variable | Staging | Production | Where |
|---|---|---|---|
| NODE_ENV | `production` | `production` | toml. Runtime mode, not environment name; staging runs prod-strict config validation on purpose |
| APP_ENV (new, Phase D) | `staging` | `production` | toml. The actual "which environment" flag; `PLAID_ENV` must never be that proxy (`CLAUDE.md`) and after this change neither is `NODE_ENV` |
| PORT | `3000` | `3000` | toml |
| LOG_LEVEL | `info` (raise to `debug` freely) | `info` | toml |
| PLAID_ENV | `sandbox` | `production` | toml |
| PLAID_WEBHOOK_URL | `https://api.stage.coiny.app/webhooks/plaid` | `https://api.coiny.app/webhooks/plaid` | toml |
| SPINWHEEL_BASE_URL | `https://sandbox-api.spinwheel.io` | `https://api.spinwheel.io` | toml |
| KALSHI_ENV | `demo` | `prod` | toml |
| TRUELAYER_ENV | `sandbox` | `live` | toml |
| COINBASE_BASE_URL | default (`https://api.coinbase.com`) | default | toml (omit) |
| APNS_BUNDLE_ID | `app.coiny.ios` | `app.coiny.ios` | toml (default already correct) |
| APPLE_BUNDLE_ID | `app.coiny.ios` | `app.coiny.ios` | toml (default) |
| RATE_LIMIT_MAX / RATE_LIMIT_WINDOW | defaults | defaults | toml (omit) |

Secrets (Fly secrets, per app):

| Variable | Same key in both? | Production key: newly obtained? | Cost / lead time | Notes |
|---|---|---|---|---|
| DATABASE_URL | **No** | Yes: the `production` branch URI; staging gets the `staging` branch URI (auto-generated fresh credentials once `production` is protected, [Neon](https://neon.com/branching/production-staging-workflows)) | $0 | The isolation proof in Phase F checks these differ |
| DATA_ENCRYPTION_KEY | **No, must differ** | Yes: freshly generated at go-live, stored in password manager + Keychain BEFORE being set in Fly (PRD R-20.3, `docs/prd.md:575`) | $0 | Consequence: ciphertext cannot cross environments, and the go-live DB wipe (Phase I) is mandatory since sandbox-era rows would be unreadable under the new key |
| PLAID_CLIENT_ID | Yes (shared across Plaid envs, [Plaid quickstart](https://plaid.com/docs/quickstart/)) | No | $0 | |
| PLAID_SECRET | **No** | Yes: the Production secret from Dashboard > API keys, usable after the Phase 0 review | Pay-as-you-go per Item post-approval | Sandbox secret stays in staging forever |
| APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID | Yes | No: one .p8 token key serves both APNs environments ([Apple](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)) | $0 | Host selection is by NODE_ENV (`backend/src/push/apns.ts:28`), so both envs use `api.push.apple.com`, which is correct for TestFlight and App Store builds (they carry the production `aps-environment`). Local Xcode builds get sandbox push only from a locally run backend. Flag: if staging ever needs sandbox pushes, introduce `APNS_ENV` rather than bending NODE_ENV |
| GOOGLE_AUTH_CLIENT_ID | Yes | No | $0 | Web OAuth client ID used as JWT audience (`backend/src/config.ts:32`); no sandbox concept. Optional later: a second OAuth client per env |
| TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET | **No** | Yes: live app credentials after TrueLayer verification (Phase 0) | Lead time Unverified | Sandbox pair stays in staging |
| SPINWHEEL_SECRET_KEY | **No** | Yes (Phase 0) | Unverified; B2B contract likely | Sandbox key stays in staging |
| COINBASE_API_KEY_ID, COINBASE_API_KEY_SECRET | Staging only | **Deliberately absent in production**: the shared operator key is confined to non-production by `isSharedCoinbaseKeyAllowed()` (`backend/src/config.ts:177`); production Coinbase waits for the OAuth build | $0 | Leave unset in prod |
| ZERION_API_KEY | Yes | No | Free tier | Read-only market data; shared rate limit is the only coupling |
| ALCHEMY_API_KEY | Yes | No | Free tier | Same |
| HELIUS_API_KEY | Yes | No | Free tier | Same |
| BLOCKFROST_PROJECT_ID | Yes | No | Free tier | Same |
| SUBSCAN_API_KEY | Yes | No | Free tier | Same |
| TONCENTER_API_KEY | Yes | No | Free tier | Same |
| GOLDAPI_API_KEY | Yes | No | Free tier, tight quota | Same |
| KICKSDB_API_KEY | Yes | No | Free tier | Same; watch the shared daily cap |
| POKEMONPRICETRACKER_API_KEY | Yes | No | Free tier | Same |
| EIA_API_KEY | Yes | No | Free ([register](https://www.eia.gov/opendata/register.php)) | Same |
| USDA_NASS_API_KEY | Yes | No | Free | Same |
| TCGAPI_KEY | Yes | No | Free tier is 100 req/day (`backend/src/config.ts:104`) | Sharing one key across both envs halves the effective budget; acceptable while staging is idle, get a second key if staging testing ever burns it |
| PCGS_API_KEY | Yes | No | Free | Same |
| DISCOGS_CONSUMER_KEY, DISCOGS_CONSUMER_SECRET | Yes | No | $0 | No sandbox exists; per-user OAuth 1.0a rides on it |
| YNAB_CLIENT_ID | Yes | No | $0 | PKCE public client, no secret, no sandbox; redirect URI is the app scheme, not a backend URL, so one client serves both envs |
| RENTCAST_API_KEY | Unset in both | n/a | Paid, no free tier | Deliberately skipped (memory note 2026); not an action item |
| MARKETCHECK_API_KEY | Unset in both | n/a | Paid, no free tier | Same |

User-supplied-key integrations (Kraken, Kalshi, Alpaca, Hyperliquid,
Polymarket, chain wallets, SnapTrade-style flows): no server-side credential
exists beyond `KALSHI_ENV`; users bring their own keys, which are stored
encrypted under each environment's `DATA_ENCRYPTION_KEY` and therefore
cannot leak across environments even in a botched copy.

This table doubles as the **secret-name manifest** for drift detection
(Phase H) and the **recovery inventory**: if the laptop dies, every "Yes,
shared" row is re-downloadable from its provider dashboard, every "No" row
is re-issuable per environment, and only DATA_ENCRYPTION_KEY (production)
plus the backup `age` key are unrecoverable if lost, which is why they live
in three places (password manager, Keychain, Fly) and nothing else does.

---

## 3. Phase B: GitHub Environments

1. **[Founder] Create the environments.** GitHub > `Coiny` repo >
   Settings > Environments > New environment: create `staging`, then
   `production`. On `production` only: enable **Required reviewers** and add
   yourself; under Deployment branches select **Selected branches** and add
   `main`. All of this is on the Free plan because the repo is public
   ([GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)).
   CLI equivalent if preferred:
   `gh api -X PUT repos/pamplemousse-glitch/Coiny/environments/staging`.
2. **[Founder] Mint app-scoped Fly deploy tokens** (one per app, so a leaked
   staging token cannot touch production,
   [Fly tokens](https://fly.io/docs/security/tokens/)). The app for staging
   does not exist until Phase D; run the staging one after D1.

   ```bash
   fly tokens create deploy -a coiny-backend --name gh-production --expiry 8760h
   fly tokens create deploy -a coiny-backend-stage --name gh-staging --expiry 8760h
   ```

   Each prints a token once. Pipe each directly into GitHub without echoing:

   ```bash
   fly tokens create deploy -a coiny-backend-stage --name gh-staging --expiry 8760h \
     | gh secret set FLY_API_TOKEN --env staging --repo pamplemousse-glitch/Coiny
   fly tokens create deploy -a coiny-backend --name gh-production --expiry 8760h \
     | gh secret set FLY_API_TOKEN --env production --repo pamplemousse-glitch/Coiny
   ```

   The 1-year expiry is a rotation forcing function; calendar it.
3. **[Founder] Add `NEON_API_KEY` to the `staging` environment** (used only
   by the migration-rehearsal workflow):

   ```bash
   gh secret set NEON_API_KEY --env staging --repo pamplemousse-glitch/Coiny
   # (prompts for the value; paste, do not type it into the command line)
   ```
4. **[Founder] Delete the repo-level `FLY_API_TOKEN`** (Settings > Secrets
   and variables > Actions) once Phase D's workflow lands, so the old
   unscoped token cannot be used by anything. Rollback for this whole phase:
   environments and secrets are freely deletable; nothing depends on them
   until Phase D's workflow references them.

---

## 4. Phase C: Neon staging branch

1. **[Founder] Protect the production branch.** Neon console >
   project `Coiny` > Branches > `production` > ... menu > **Set as
   protected**. (Verified unprotected as of 2026-08-13.) Child branches
   created afterwards get fresh credentials automatically
   ([Neon](https://neon.com/branching/production-staging-workflows)).
   CLI: `neon branches set-protected production --project-id noisy-bonus-65551609`
   (**Unverified subcommand name**; the console path above definitely
   exists, use it if the CLI flag differs).
2. **[Founder] Create the staging branch:**

   ```bash
   neon branches create --project-id noisy-bonus-65551609 \
     --name staging --parent production
   ```

   Branching from `production` is safe today precisely once: it contains
   only sandbox/test data (see the research doc §4). After go-live this
   command is forbidden; staging is never reset from production again.
3. **[Founder] Capture the staging connection string** for Phase E, without
   displaying it:

   ```bash
   export STAGING_DATABASE_URL="$(neon connection-string staging \
     --project-id noisy-bonus-65551609)"
   ```

Cost check: second branch and its scale-to-zero compute fit inside the Free
plan (10 branches, 100 CU-hours/project,
[Neon plans](https://neon.com/docs/introduction/plans)); the project is 33 MB
against the 0.5 GB Free storage cap. Upgrade to Launch (pay-as-you-go, $0
floor) when either cap approaches. Rollback: `neon branches delete staging`.

---

## 5. Phase D: Fly staging app and the repo changes

1. **[Founder] Create the app:**

   ```bash
   fly apps create coiny-backend-stage --org personal
   ```
2. **[Agent] Add `fly.staging.toml`** at the repo root, next to `fly.toml`
   (which stays production and keeps its committed name so
   `flyctl deploy` with no flags remains production-correct). Contents
   mirror `fly.toml` with exactly these differences:

   ```toml
   app = 'coiny-backend-stage'
   # [env]: APP_ENV = 'staging', PLAID_WEBHOOK_URL = staging URL,
   #        SPINWHEEL_BASE_URL / KALSHI_ENV / TRUELAYER_ENV per the Phase 2 table
   # [http_service]: auto_stop_machines = 'stop', min_machines_running = 0
   ```

   Scale-to-zero staging costs rootfs only when stopped ($0.15/GB per 30
   days) versus ~$2.02/mo running
   ([Fly pricing](https://fly.io/docs/about/pricing/)); inbound HTTP
   auto-starts it (`auto_start_machines`).
3. **[Agent] Add the release command to BOTH tomls** and remove the boot
   migration:

   ```toml
   [deploy]
     release_command = 'node backend/dist/db/migrate-run.js'
   ```

   and delete the `runMigrations()` call from `backend/src/server.ts:65`.
   A failing migration now halts the deploy instead of crash-looping the
   app ([Fly config reference](https://fly.io/docs/reference/configuration/)).
   Note: the release machine runs with the app's secrets, so `DATABASE_URL`
   is present; no migration credential ever enters GitHub.
4. **[Agent] Add `APP_ENV` to the config schema**
   (`backend/src/config.ts`): `z.enum(['staging', 'production']).optional()`
   surfaced in the `/health` payload and log bindings only. Nothing
   load-bearing branches on it.
5. **[Agent] Split `.github/workflows/backend-deploy.yml`** into two jobs,
   keeping the existing `pull_request: closed` + `merged == true` trigger
   and SHA-pinned actions:

   - `deploy-staging`: `environment: staging`, runs
     `flyctl deploy --config fly.staging.toml --remote-only`, automatic.
   - `deploy-production`: `needs: deploy-staging`,
     `environment: production` (which enforces the required-reviewer gate
     before the job or its secrets run), runs
     `flyctl deploy --remote-only`. Every merge to main thus offers a
     production deploy that the founder approves in the Actions UI when
     ready and dismisses otherwise; `workflow_dispatch` stays as the manual
     path. **DECISION** (approve-per-merge versus tag-triggered releases):
     default is approve-per-merge; revisit if dismissing stale deployment
     requests becomes noise.
6. **[Founder] DNS and certs** (after Phase 0 domain purchase):

   ```bash
   fly certs add api.coiny.app -a coiny-backend
   fly certs add api.stage.coiny.app -a coiny-backend-stage
   ```

   Each prints the CNAME/AAAA records to add at the registrar; then
   `fly certs check <hostname> -a <app>` until green. Update
   `PLAID_WEBHOOK_URL` in both tomls to the new hostnames, and register the
   staging webhook URL in the Plaid dashboard (Developers > Webhooks) for
   the sandbox environment.

Rollback for this phase: `fly apps destroy coiny-backend-stage` and revert
the repo commits; production's app and workflow behavior are unchanged until
step 5 merges, and even then `workflow_dispatch` still deploys production
exactly as today.

---

## 6. Phase E: load staging secrets

1. **[Founder] Copy the sandbox secret set from Keychain into the staging
   app** without echoing values. `bin/load-secrets.sh` already exports them
   locally; reuse that:

   ```bash
   source bin/load-secrets.sh
   fly secrets set -a coiny-backend-stage \
     PLAID_CLIENT_ID="$PLAID_CLIENT_ID" \
     PLAID_SECRET="$PLAID_SECRET" \
     APNS_KEY="$APNS_KEY" APNS_KEY_ID="$APNS_KEY_ID" APNS_TEAM_ID="$APNS_TEAM_ID" \
     GOOGLE_AUTH_CLIENT_ID="$GOOGLE_AUTH_CLIENT_ID" \
     ZERION_API_KEY="$ZERION_API_KEY" \
     ...  # continue for every populated var in the Phase 2 table
   ```
2. **[Founder] Staging-specific values:**

   ```bash
   fly secrets set -a coiny-backend-stage DATABASE_URL="$STAGING_DATABASE_URL"
   fly secrets set -a coiny-backend-stage DATA_ENCRYPTION_KEY="$(openssl rand -hex 32)"
   ```

   The staging encryption key is generated fresh and intentionally NOT
   archived: losing it merely forces staging re-links, and not archiving it
   guarantees it can never be mistaken for the production key.
3. **[Founder] First staging deploy:**
   `fly deploy --config fly.staging.toml --remote-only` from the repo root
   (or merge any backend PR and let the new workflow do it).

Rollback: `fly secrets unset`/`set` are idempotent; nothing else consumes
these yet.

---

## 7. Phase F: staging verification checklist

All **[Founder]**, one sitting:

1. `curl -s https://api.stage.coiny.app/health` returns 200 and reports
   `APP_ENV=staging` (after Phase D4).
2. Scale-to-zero behaves: `fly machine list -a coiny-backend-stage` shows
   the machine stopped after idle; the curl above cold-starts it.
3. Migrations ran at release, not boot: `fly releases -a coiny-backend-stage`
   shows the release command succeeded;
   `fly logs -a coiny-backend-stage` shows no migration output at server
   start.
4. **The two-databases proof.** Create a marker in staging, prove it is
   invisible from production:

   ```bash
   neon psql staging --project-id noisy-bonus-65551609 \
     -- -c "CREATE TABLE IF NOT EXISTS env_marker(env text); \
            INSERT INTO env_marker VALUES ('staging');"
   neon psql production --project-id noisy-bonus-65551609 \
     -- -c "SELECT * FROM env_marker;"
   # EXPECTED: ERROR: relation "env_marker" does not exist
   ```

   Also confirm the two `neon connection-string` outputs differ in host and
   credentials (do not print them; `diff <(cmd1) <(cmd2) >/dev/null || echo differ`).
5. End-to-end sandbox flow: sign in from a Debug build pointed at staging,
   link with Plaid sandbox (`user_good` / `pass_good`), see the number
   render, and confirm the Plaid sandbox webhook arrives in
   `fly logs -a coiny-backend-stage` (fire one from Plaid Dashboard >
   Developers > Sandbox > send test webhook if needed).

---

## 8. Phase G: point the clients at the right places

1. **[Agent] iOS xcconfig plumbing.** In `ios/`: add
   `Configs/Debug.xcconfig`, `Configs/Beta.xcconfig`,
   `Configs/Release.xcconfig`, each defining `API_BASE_URL` (Debug:
   `http:/$()/127.0.0.1:3000`; Beta: staging URL; Release: production URL;
   the `$()` trick stops xcconfig treating `//` as a comment). In
   `ios/project.yml`: add the `Beta` configuration (type release) and map
   `configFiles` per configuration; add `API_BASE_URL` to `Info.plist` as
   `$(API_BASE_URL)`; replace the `#if targetEnvironment(simulator)` block
   in `ios/Coiny/Services/API.swift:17-23` with a read of that plist key.
   Run `xcodegen` after (memory note: regenerate after project.yml changes;
   close Xcode first). Mechanism per
   [Apple's build-configuration docs](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project).
2. **[Agent] Android equivalent:** `buildConfigField` `BASE_URL` per build
   type in the app module's Gradle config: debug > staging URL, release >
   production URL.
3. **[Founder] TestFlight mapping.** Internal-testing builds are archived
   from the Beta configuration and exercise staging; the build submitted
   for App Review is Release and requires production live with real Plaid
   credentials (App Review runs the real app; StoreKit purchases in
   TestFlight hit Apple's sandbox regardless,
   [Apple sandbox testing](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox)).
4. **[Founder] App Store Server Notifications URLs** (App Store Connect >
   your app > App Information > App Store Server Notifications; exact
   panel name **Unverified**, it moves): set the **Sandbox** URL to
   `https://api.stage.coiny.app/webhooks/appstore` and the **Production**
   URL to `https://api.coiny.app/webhooks/appstore`, matching
   `backend/src/webhook/appstore.ts` (lands with PR #191). Version 2
   notifications.

The standing contract rule, enforced in PR review from here on: backend
merges and reaches staging before the client change that needs it; shipped
API surface only ever changes additively; the server is always newer than
the oldest client talking to it.

---

## 9. Phase H: drift detection, backups, secret hygiene

1. **[Agent] Drift-check workflow.** `.github/workflows/env-drift.yml`,
   weekly cron + `workflow_dispatch`, two jobs (one per GitHub Environment
   so each uses its own scoped token): run `fly secrets list -a <app>` and
   diff the secret *names* against the Phase 2 manifest; run
   `fly config show -a <app>` and diff against the committed toml; with
   `NEON_API_KEY`, assert `production` is protected and `staging` exists.
   Names and settings only, never values. Failure lands in the Actions
   email inbox. Diff-and-alert only; no auto-reconciliation.
2. **[Agent] Backups, PRD R-20.1/R-20.2** (`docs/prd.md:575`): nightly
   `pg_dump` of the production branch via Actions cron, `age`-encrypted, to
   S3 (or any dumb bucket), 30-day retention, following
   [Neon's automated pg_dump guide](https://neon.com/docs/manage/backup-pg-dump-automate);
   plus the quarterly restore rehearsal into a scratch Neon branch asserting
   row counts and one token decryption. MAJOR before the first tester.
3. **[Founder] Secret store hardening.** **DECISION** (password manager
   choice; default: whichever he already pays for): create entries for
   every row of the Phase 2 table (name, where-to-reissue, date last
   rotated; values only for the two unrecoverables). Keychain remains the
   `bin/load-secrets.sh` cache. Calendar: annual key rotation, 1-year Fly
   token expiry from Phase B.

---

## 10. Phase I: production cutover (gated on Phase 0 approvals)

Ordered so nothing is ever live-and-broken; each step's rollback given.
Precondition: Phases A to H done, staging green for at least one real week
of use, Plaid production access granted, App ID registered.

1. **[Founder] Generate and archive the production
   `DATA_ENCRYPTION_KEY`** before anything else: `openssl rand -hex 32 |
   pbcopy`, paste into the password manager entry, then into Keychain via
   interactive `security add-generic-password -s coiny-data-encryption-key-prod -a coiny -w`
   (interactive `-w` per house rule), then clear the clipboard. It must
   exist in the archive before Fly ever sees it (R-20.3). Rollback: n/a,
   nothing consumes it yet.
2. **[Founder] Wipe the production database.** It holds only sandbox-era
   test rows, which the new encryption key would render unreadable anyway:

   ```bash
   neon psql production --project-id noisy-bonus-65551609 \
     -- -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```

   Rollback: Neon instant restore within the history window (6 hours on
   Free, [Neon backups](https://neon.com/docs/manage/backups)), so schedule
   this step with daylight ahead of it.
3. **[Founder] Set production Fly secrets** per the Phase 2 table: real
   `PLAID_SECRET`, the new `DATA_ENCRYPTION_KEY` (from Keychain, not
   clipboard), production `DATABASE_URL`, TrueLayer live pair when granted,
   Spinwheel prod key when granted; `fly secrets set -a coiny-backend ...`
   using the no-echo pattern of Phase E. Update `fly.toml` `[env]`:
   `PLAID_ENV = 'production'`, `APP_ENV = 'production'`, webhook URL to
   `api.coiny.app` ([Agent] commits the toml change through a PR).
   Rollback: reset the secrets to the sandbox set; nothing is serving users
   yet.
4. **[Founder] Register the production Plaid webhook URL** in the Plaid
   dashboard and confirm OAuth institution registration is complete.
5. **[Founder] Deploy through the gate:** merge the toml PR, approve the
   `production` job in the Actions UI. The release command migrates the
   empty database from 0000 upward, which is itself the final end-to-end
   proof of journal integrity. Rollback: `fly releases -a coiny-backend` +
   `fly deploy -i <previous-image>`; the DB can be re-wiped freely until
   the first real user exists.
6. **[Founder] Production verification checklist:** `/health` 200 with
   `APP_ENV=production`; the Phase F two-databases proof re-run (the marker
   still exists only in staging); a real bank link with the founder's own
   credentials as user zero; a Plaid production webhook observed in logs;
   push notification received on a TestFlight build; App Store sandbox
   purchase flows through `webhooks/appstore` on... note: sandbox
   StoreKit notifications go to the STAGING URL by Phase G4's mapping, so
   verify entitlement grant end-to-end on staging and verify production's
   notification URL simply returns 200 to Apple's initial ping.
7. **[Founder] Ship:** archive the Release build, submit. From this moment
   the §4 rule is in force: nothing flows from `production` downward, the
   staging branch is never reset, and every migration reaching production
   has passed the rehearsal workflow first.

---

## Standing rules after cutover (the one-screen summary)

- Merge to `main` deploys staging; production deploys only through the
  approval gate. Neither happens without CI green.
- Migrations: journal check in CI, rehearsal branch on every drizzle PR,
  applied only by `release_command`, never at boot, never by hand.
- Secrets: values live in Fly + password manager (+ Keychain cache); GitHub
  holds only deploy tokens and `NEON_API_KEY`; the repo holds only names.
- Data: production data never leaves production. Staging is synthetic
  forever. The split `DATA_ENCRYPTION_KEY` enforces this even against
  mistakes.
- Clients: environment chosen at build time via xcconfig/Gradle; server
  deploys before the client that needs it; shipped API changes are additive.
