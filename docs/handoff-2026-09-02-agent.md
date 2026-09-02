# Handoff, 2026-09-02 (second session)

*Follows `handoff-2026-09-02.md`, which set the queue this session worked.
Eleven PRs, #353 to #363. Every agent item that handoff named is done. Nothing
here moves the MVP blocker, which is still that `coiny-api` does not exist and
the App ID is unregistered.*

---

## 0. The one thing worth reading

**Every PR in the repository was red, and it had nothing to do with any of
them.**

`backend-ci.yml:41` runs `pnpm audit --audit-level=high` inside the `test` job.
Nine HIGH advisories, all `fast-uri` transitively under fastify, failed that
step in 23 seconds, before install, before a single test. #351 and #352 had been
sitting on it. The job log ends in a wall of dependency tables and the actual
line is `##[error]Process completed with exit code 1` under **Dependency audit
(SCA)**, which reads like a test failure at a glance.

Fixed in #355 with a lockfile refresh: both parents already accepted the patched
versions, so no `package.json` changed.

**If a PR is red, read which STEP failed before reading the diff.** A repo-wide
gate looks exactly like your own bug when the check is named `test`.

---

## 1. What shipped

| PR | What | Why it mattered |
|---|---|---|
| #353 | G2.15, the swallowed Plaid failure on Home | A link that succeeded at Plaid and failed at Coiny was indistinguishable from the user backing out. Nothing to read, nothing to tap, no `error` event |
| #354 | G1.27, nightly encrypted `pg_dump` + deletion tombstones | Neon's six-hour window was the entire backup story, and the privacy policy's "30 days" described a job that had never run |
| #355 | The audit fix above | Unblocked every other PR |
| #356 | Scheduled refresh for the credential vendors | Ten of them refreshed only when the user opened that screen |
| #357 | Repair paths for everything that is not Plaid | **The Reconnect button was set-and-never-read.** It did nothing, for every provider |
| #358 | Two-sided plausibility + breadth escalation | The collapse detector only watched the number get smaller, and a unit error breaks both ways |
| #359 | R-8.2 staleness label on Home | Home shows real money and carried no timestamp anywhere. It is the default tab |
| #360 | G1.10, the 30-second Home poll | 120 requests an hour, and a WCAG 2.2.2 failure: VoiceOver could not finish reading Home |
| #361 | G3.13, `LazyVStack` in the accounts directory | 200 holdings built 200 views before the first frame |
| #362 | G2.12, read-only key guidance for Alpaca and Kalshi | The privacy policy claimed we ask for read-only keys. Two of the three screens did not, and they are the two whose keys carry trade rights |
| #363 | G1.22, request latency samples + budget checking | Every p95 in `engineering-budgets.md` §1 was unfalsifiable |

---

## 2. Three bugs that were worse than the row describing them

The runbook is accurate about *what* is wrong and conservative about *how bad*.
All three of these were found by opening the file the row pointed at.

**The Reconnect button did nothing.** The runbook says the non-Plaid
connections "show broken with nothing to tap". There is a button.
`NetWorthView` set `reconnectTarget = entry` and nothing in the app read that
state: no sheet, no navigation, no call. `grep -rn reconnectTarget Coiny/`
returned exactly two lines, the declaration and the assignment. A dead button on
the one screen that names the broken connection is worse than no button, because
it spends the user's trust before it fails.

**The NFT sync could never record a failure.** `api/nft.ts` had
`try { try { … } catch { warn } } catch { recordSyncFailure; throw }`. The inner
catch swallowed everything, so the outer one was unreachable and
`recordSyncFailure` had never run for a single wallet. `consecutive_failures`
stayed at zero forever, so `deriveConnectionStatus` kept answering `ok` for a
wallet that had not been priced in weeks. The control existed, the call site
existed, and nothing could reach it. Same shape as the 2026-09-02 handoff's own
lesson about controls nothing invokes.

**YNAB was the tenth vendor in a list of nine.** The handoff named nine
credential vendors with no scheduled refresh. `grep -rn ynabConnections src/`
finds the route, the revoke path and the key-rotation registry, and nothing in
`networth/refresh.ts`. It was left out of the list, not out of the gap.

---

## 3. Where a recommendation was not followed, and why

Audit row 4.13.4 recommends putting `responseTime` and `route` into
`analytics_events`. #363 puts them in a new table with no user column instead,
because `store/ops.ts` had already written down why that table is wrong for this:

- it is **consent-gated**, so one person's usage-sharing opt-out would blind us
  to our own p95, which is the same incoherence that argument rejects for vendor
  outages;
- `analytics_events.user_id` is **NOT NULL**, so route plus timestamp against a
  user id is a behavioural trail: which screens someone opened and when.

The audit's actual requirement, first-party and no new processor in
`service-providers.md`, is met either way.

**The pattern worth keeping:** when a row recommends a mechanism, check whether
this codebase has already reasoned about that mechanism somewhere else. Twice
this session the answer was in a file header.

---

## 4. What is left

**Founder, and this has not moved.** `coiny-api` does not exist, App ID
`app.coiny.ios` is unregistered, zero of the three Apple Sign In secrets are
set. `docs/founder-tasks.md` is the list; §2.7 is new this session and is five
minutes of `openssl` that turns the nightly backup on. Until it runs, Neon's
six-hour window is still the entire backup story and the privacy policy's
"30 days" still describes something that has never happened.

**Agent, ordered.**

- **G3.17**, snapshot tests at default and AX5. Deliberately not done. The
  runbook itself files it second behind G1.8, which already catches clipping,
  and it carries a golden-image maintenance cost that a solo project pays every
  time a font metric moves. Worth doing when the design stops changing, not
  before.
- **Split the two `GET /api/net-worth` budgets.** #363 applies the looser 3 s
  figure because a latency sample does not record whether that request triggered
  a refresh. A `refreshed` boolean on the sample would let the 400 ms cached-read
  budget be checked, which is the one users actually feel. Named in
  `observability/request-samples.ts`.
- **Per-vendor plausibility.** `checkValueTransition` runs only on
  `assetClassCache` writes, which covers five classes. The ten credential
  vendors write straight to their own tables and get no plausibility check at
  all, so the collapse and inflation detectors do not watch Kraken, Alpaca,
  chain wallets or the rest.
- **A second backup destination.** #354's retention is GitHub's. Deleting the
  repository takes the dumps with it. Object storage in another account is the
  next increment and it is a cost decision, not an engineering one.
- **Rehearse a real `pg_restore`.** The envelope round trip is tested on every
  commit, which proves the encryption is reversible. It does not prove
  `pg_restore` accepts the file. Do one before the first real user and record the
  wall clock, per R-20.2.

---

## 5. Verification notes that cost time this session

Everything in §6 of the previous handoff still holds. Three additions:

- **Never write a file while a suite is running.** A migration created mid-run
  was picked up by the running suite and failed 3 files. It also hid a real bug
  (a missing `--> statement-breakpoint`, without which PGlite rejects a
  multi-statement migration) inside noise that looked like the load problem.
- **`npx vitest --root backend` from the repo root fails the same way as
  `npx vitest` from the repo root.** Broken native binding, zero tests, non-zero
  exit. The `--root` flag does not save you; `cd backend` does.
- **A new table with no FK path to `users` must be added to the TRUNCATE list in
  `tests/db-helper.ts` by hand.** Two of the four tables in that list were added
  this session, and `request_samples` failed three tests on the first run because
  a leaked row is a latency sample the next test's percentile silently includes.
  The file's comment says this; it is easy to read it as a historical note rather
  than an instruction.

---

## 6. Load, and how to tell a real failure from the machine

The full suite at `test:coverage` parallelism timed out two unrelated files
(`compression`, `health-liveness`) at load average 45 to 67. Both passed in
isolation in nine seconds and passed in the same run under `test:local`.

The rule from the previous handoff worked exactly as written: check `uptime`
before diagnosing, then re-run the file alone, then re-run the whole suite at
reduced parallelism. Do all three before touching the code. Nothing this session
turned out to be a real failure that first presented as a timeout.
