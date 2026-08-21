# Connection Resilience and Contract Drift: a state-of-the-art survey

*Written 2026-08-21 against the brief in `handoff-2026-08-21.md` section 4.
Research document, not a spec. Nothing here is built yet. Requirement IDs are
owned by `prd.md`; performance and cost numbers by `engineering-budgets.md`.*

**Why this exists.** `market-research-2026-08.md` section 3.1 finds broken
connections the top reason people quit this category, "by a distance". The
domain is unforgiving for one reason: **a wrong number and a right number look
identical.** A failed image load is visibly broken. A failed balance fetch is
just a smaller number.

The brief asked two questions and said to treat them as equally important.
They turn out to be the same question asked at two timescales:

1. **A connection breaks.** The vendor tells us, or stops answering. Loud.
2. **A contract drifts.** The vendor keeps answering `200 OK` and the answer
   now means something else. Silent.

Everything below is organised around a single claim: **we are well defended
against (1) for exactly one of our 38 integrations, and undefended against (2)
for all of them.**

---

## 0. Method, and what was actually read

Sources were read as code and primary documentation where possible, not as
blog posts. Where a source could not be reached it says so.

| Read | What it gave |
|---|---|
| [Plaid `ITEM_*` error reference](https://plaid.com/docs/errors/item/) | The user-actionable / transient split, and which errors must **not** prompt |
| [Plaid Link update mode](https://plaid.com/docs/link/update-mode/) | Repair-without-relink as the intended path |
| [MX `list-members` OpenAPI reference](https://docs.mx.com/api-reference/platform-api/reference/list-members) | A 22-value connection status vocabulary |
| [Actual Budget `syncStatus.ts` + `AccountSyncCheck.tsx`](https://github.com/actualbudget/actual) | A shipped per-account status model and its exact UI copy |
| [Maybe Finance `plaid_item.rb`, `sync.rb`, `syncable.rb`](https://github.com/maybe-finance/maybe) | The sync-attempt-as-entity pattern, and a 2-value item status |
| [Envoy outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier) | The keying dimension our breaker gets wrong, plus ejection mechanics |
| [opossum](https://github.com/nodeshift/opossum) | `volumeThreshold`, rolling windows, half-open probes |
| [Google SRE, handling overload](https://sre.google/sre-book/handling-overload/) | The 10% client retry budget |
| [dbt source freshness](https://docs.getdbt.com/reference/resource-properties/freshness) | `warn_after` / `error_after`, independently identical to our two-threshold policy |
| [TDCommons: silent backward-incompatible API contract drift](https://www.tdcommons.org/dpubs_series/10178/) | Structural-semantic fingerprints and the four invariant categories |
| [Great Expectations distribution checks](https://docs.greatexpectations.io/docs/reference/learn/data_quality_use_cases/distribution/) | A concrete anomaly rule: deviation ≥10% from the mean of the last five runs |
| [oasdiff](https://github.com/oasdiff/oasdiff), [plaid/plaid-openapi](https://github.com/plaid/plaid-openapi) | Schema-diff monitoring is available to us today, not in principle |
| Our own code, 2026-08-21 | See section 4 |

**Could not be read:** Monarch's help centre (`help.monarch.com`, Cloudflare
403 to both WebFetch and curl). Its status vocabulary below comes from search
result summaries, not the page, and is marked accordingly. Copilot, Kubera and
Empower were not reached at screenshot level at all. **The competitor-UX
section is the weakest part of this survey** and is the one place where a
founder with the apps installed beats an agent with a browser.

**Verified while writing, since the brief said to check before claiming
absence:** Zerion does publish a changelog, at
`https://developers.zerion.io/changelog` (200; `developers.zerion.io/reference/changelog`
is a 404, which is where a guess would have landed). Plaid publishes its
OpenAPI spec at `plaid/plaid-openapi`, 3.1 MB, 74,011 lines, last pushed
2026-08-17.

---

# Part A: broken connections

## A1. Everyone converges on the same vocabulary, at different resolutions

Four systems, four status vocabularies, one shape.

| System | Values | Grain |
|---|---|---|
| **Maybe Finance** | `good`, `requires_update` | per item |
| **Actual Budget** | `ok`, `pending`, `sync-requested`, `reauth-required`, `attention-required`, `rate-limit-exceeded`, `timed-out`, `account-missing` | per **account** |
| **Coiny (today)** | `ok`, `stale`, `stale_excluded`, `error`, `disconnected`, `not_connected`, `pending`, `reauth_required`, `expiring` | per asset **class** |
| **MX** | 22 values: `CREATED`, `PREVENTED`, `DENIED`, `CHALLENGED`, `REJECTED`, `LOCKED`, `CONNECTED`, `IMPEDED`, `RECONNECTED`, `DEGRADED`, `DISCONNECTED`, `DISCONTINUED`, `CLOSED`, `DELAYED`, `FAILED`, `UPDATED`, `DISABLED`, `IMPORTED`, `RESUMED`, `EXPIRED`, `IMPAIRED`, `PENDING` | per member |

The distinction every one of them draws, and the only one that matters
operationally:

> **Can the user fix this, or can only we (or the vendor) fix it?**

Plaid draws it explicitly. `ITEM_LOGIN_REQUIRED` and `ITEM_LOCKED` are
user-actionable; `ITEM_CONCURRENTLY_DELETED` is a backend race and must not
produce a prompt. Plaid's own rule of thumb is sharper than a code list: an
error with `display_message: null` is not meant to be shown to a human.

Actual encodes the same split in the UI rather than the schema. Both
`reauth-required` and `rate-limit-exceeded` are failure states, but only the
first offers a **Reauthorize** button; a rate-limited or timed-out account gets
**Unlink** and nothing else, because there is nothing the user can do about it:

```ts
const showAuth =
  (type === 'ITEM_ERROR' && code === 'ITEM_LOGIN_REQUIRED') ||
  (type === 'INVALID_INPUT' && code === 'INVALID_ACCESS_TOKEN');
```

**Verdict on our vocabulary: it is good, and better than three of the four.**
`pending` in particular ("connected, first fetch has not finished") is a
distinction Maybe and MX both lack, and it is the one that stops a new user's
first screen reading `$0`. Nothing in the survey argues for adding states.

**What our vocabulary is missing is not a value. It is a grain.** Ours is the
only one keyed to an *asset class* rather than to a *connection*. Actual, the
closest comparable, goes one level finer than a connection and keys to the
individual account. This is gap 2 in the handoff, and the survey confirms it is
the outlier, not a defensible simplification.

## A2. The pattern we are missing: the sync attempt is an entity

Maybe's `PlaidItem.status` is a two-value enum, thinner than ours. It gets away
with that because the interesting state lives somewhere else: a polymorphic
`Sync` record, created per attempt, with its own state machine.

```ruby
# app/models/sync.rb
STALE_AFTER = 24.hours   # a cron marks unresolved syncs stale
VISIBLE_FOR = 5.minutes  # how long a sync shows in the UI

aasm column: :status do
  state :pending, initial: true
  state :syncing
  state :completed
  state :failed
  state :stale        # never completed within the expected window
end
```

Four properties of this are worth stealing, and none of them are the state
machine itself:

1. **Attempts are rows, not counters.** We have `consecutiveFailures`, an
   integer. Maybe has a history. You can alert on a history, show it, chart it,
   and ask "when did this start". You cannot do any of that with a counter, and
   handoff gap 4 ("`consecutiveFailures` drives backoff and nothing else") is a
   direct consequence of choosing a counter.
2. **Parent/child syncs, with failure propagating up.** `finalize_if_all_children_finalized`
   fails the parent when any child failed. A user-level "your refresh finished,
   partially" is derivable. Ours is not.
3. **A `stale` terminal state distinct from `failed`.** A sync that never
   resolved is a *different fact* from one that resolved unsuccessfully, and the
   comment names why it happens: "Syncs often become stale when new code is
   deployed and the worker restarts." Our in-process scheduler has exactly this
   failure mode on every Fly deploy, and currently it is invisible.
4. **`VISIBLE_FOR = 5.minutes`.** A UI honesty budget: after five minutes, stop
   telling the user something is in progress. Ours has no equivalent, so
   `pending` can in principle display forever.

Maybe's error handling also draws the operator/user line cleanly, in the
importer:

```ruby
case error_body["error_code"]
when "ITEM_LOGIN_REQUIRED"
  plaid_item.update!(status: :requires_update)   # user's problem
else
  raise error                                     # our problem: fails the Sync, hits Sentry
end
```

One branch tells the user, the other branch tells us. We have the first branch
for Plaid and **we have no second branch at all**, which is handoff gap 5.

## A3. Detection: three layers, and we already have all three (for Plaid)

Mature systems detect breakage three ways, in descending order of speed and
ascending order of reliability:

| Layer | Speed | Catches | Ours |
|---|---|---|---|
| Vendor webhook | seconds | what the vendor chooses to tell us | `webhook/plaid.ts`, ES256 + body hash verified |
| Scheduled reconciliation sweep | ~1 day | missed, dropped or rejected webhooks | `scheduler/plaid-health.ts`, daily `/item/get` |
| Failure observed in the data path | next refresh | everything else | `asset_class_cache.consecutiveFailures` |

`scheduler/plaid-health.ts` is, on the evidence of this survey, **ahead of the
open-source field.** Neither Actual nor Maybe reconciles against the vendor on a
schedule; both wait for a sync to fail. Its header comment states the reason
better than any source found:

> "Every one of those leaves an item broken in reality and `healthy` in our
> database, which is the worst possible combination for a net worth app: a
> confident number that is wrong, with nothing anywhere that disagrees."

Two details in it are correct in ways that are easy to get wrong, and should be
preserved verbatim when the pattern is generalised to other vendors:

- **`REAUTH_ERROR_CODES` is a deliberate allowlist.** Rate limits, institution
  outages and product errors do not move the lifecycle state. The comment is
  right that "telling someone to re-link because Plaid was briefly busy trains
  them to ignore the message". This is the same judgement Actual encodes in
  `showAuth`, reached independently.
- **The sweep transitions through the same `transitionItemStatus` the webhook
  uses.** Two detectors, one transition function, so they cannot drift.

## A4. Repair without nagging

The brief asked how mature systems "repair it without nagging". The honest
finding is that **the published literature on this is thin**, and most of what
is written is generic notification-channel advice that does not transfer. The
useful principles found:

- **Warn before the break, not after.** Plaid's `PENDING_EXPIRATION` gives a
  seven-day lead time for EU consent expiry, and update mode can be launched
  pre-emptively. `plaid/item-lifecycle.ts` already has this exactly right:
  "`expiring` is the seven-day warning and the highest-value one: a break the
  user fixes before it happens is not a break."
- **Never spend a notification on good news about plumbing.** Our
  `PUSH_ON_STATUS` deliberately omits `healthy`, with the reasoning that
  recovery "shows up in-app on next open". No source contradicts this; several
  fintech-notification write-ups implicitly argue the opposite, and they are
  writing about payment failures, where the stakes per event are different.
- **Suppress the transient tier entirely.** Both Plaid (`display_message: null`)
  and Actual (`showAuth`) refuse to surface an error the user cannot act on.
  A rate limit is our problem, not theirs.
- **The prompt must name the institution.** Ours does: `plaid_items` captures
  `institutionId` / `institutionName` at link time precisely so the repair
  prompt can say which bank.

**The gap is not the policy, it is the reach.** All of the above exists, and all
of it is Plaid-only.

## A5. What to show, and the one thing every source agrees on

Actual's copy is worth quoting because it is short and it does not lie:

> "This account is experiencing connection problems. Let's fix it."
> "Your password or something else has changed with your bank and you need to
> login again."
> "Rate limit exceeded for this item. Please try again later."

Note the register shift: the user-actionable message says what changed and what
to do; the transient message says "later" and offers no button.

MX's per-status human-readable `connection_status_message` field is the same
idea, industrialised: the vendor ships the copy so every downstream app says
the same thing.

**Monarch (unverified, from search summaries only, page was 403):** the user is
told the account "may appear disconnected, or you may see inaccurate data such
as missing transactions or an old account balance", is given an **Update**
action on the account detail page, and is told to wait 24 hours before retrying
if reconnection fails. Whether a disconnected account is excluded from Monarch's
net worth total could not be determined and **should not be assumed either way**.

The convergent principle across every system read: **an un-refreshable balance
is not a wrong balance.** It is a real number with a known age. All four systems
keep showing it, and label it. Our `deriveStatus` says the same thing in a
comment that is one of the better lines in the codebase:

> "A broken login does not make the last known balance wrong, it makes it
> un-refreshable."

## A6. Freshness has better prior art than we assumed, and it agrees with us

Three independent traditions have landed on a **two-threshold** freshness model,
which is exactly `FRESHNESS`'s `freshMs` / `excludeMs`:

| Tradition | Threshold 1 | Threshold 2 |
|---|---|---|
| HTTP caching (RFC 5861) | `max-age`: past this, revalidate | `stale-while-revalidate` / `stale-if-error`: how long a stale answer still beats no answer |
| dbt source freshness | `warn_after` | `error_after` |
| **Coiny `networth/classes.ts`** | `freshMs` | `excludeMs` |

`excludeMs: null` for collectibles is our version of an unbounded
`stale-if-error`, and the stated reason ("an old price beats a hole in net
worth") is the same reason `stale-if-error` exists in the RFC. This is a case
where the survey's job is to say **do not touch this**, it is right, and the
convergence from three unrelated domains is the evidence.

The one thing HTTP has that we do not: `stale-while-revalidate` is a *client*
affordance, letting the client render immediately and refresh behind the render.
`GET /api/net-worth` is already a pure DB read, so we have the server half. The
iOS half (render cached, revalidate, never block on the network) is worth
checking against G1.10, the open 30-second Home poll, which is the opposite
pattern.

---

# Part B: contract drift

## B1. Why schema validation is the wrong instrument for this

The five pillars of data observability, as the field has settled them, are
**freshness, volume, schema, distribution, lineage**. Map our two incidents onto
them:

| Incident | Pillar violated | Would a Zod schema have caught it? |
|---|---|---|
| **#302 Polkadot** moved balances to Asset Hub; relay chain still returns `200 OK` with dust | **Distribution** | No. Same shape, same types, plausible numbers, wrong magnitude |
| **#295 Zerion** `getPositions` needed pagination nothing had noticed | **Volume** | No. Every returned row was valid; the missing rows were simply absent |

**Neither incident touched the schema pillar.** This is the whole finding of
Part B. Our instinct, and the instinct of most of the contract-testing
literature, is to reach for schema validation, and schema validation covers
exactly the one pillar that neither of our real incidents violated.

The brief already framed this correctly: "a schema parse failure is the GOOD
case because it's loud". The survey's contribution is to say what the loud case
covers and what it does not, and to name the two pillars that actually failed.

A third framing of the same point, from the TDCommons disclosure on silent
contract drift, which enumerates four invariant categories learned from
historical traffic:

1. field presence expectations
2. type stability
3. nullability expectations
4. cross-field dependency rules

A JSON Schema or Zod schema expresses (1), (2) and (3) statically. Only (4) is
beyond it, and even (4) is structural. **None of the four catches a number that
is the right type, in the right field, and 99% too small.**

## B2. The techniques, ranked by value per unit of effort

Ranked for our situation specifically: 38 vendors, one developer, no traffic,
no error tracking.

### Tier 1: catches our actual incidents, cheap

**Canary assertions on real vendor responses.** A known address with a known
holding, queried on a schedule, asserted against a recorded expectation with a
tolerance band. This is the only technique surveyed that would have caught
**both** #302 and #295:

- Polkadot: a canary address holding a known non-trivial DOT balance returns
  dust. Fails a "value within ±X% of last known" assertion the next day.
- Zerion: a canary wallet with more than one page of positions returns exactly
  `page_size` rows. Fails a "row count is not suspiciously equal to the page
  limit" assertion immediately.

Cost: one config file of (vendor, fixture, expectation) plus a scheduled job.
No new dependency, no vendor contract, no CI integration required.

The design constraint, well put in the drift-monitoring literature: *treat a
first observation as a profile rather than an alarm, hold baselines across
normal variance, and fire only on displacement that persists.* A canary that
alerts on day one is a canary that gets muted by week two.

**Invariant assertions on user data in the refresh path.** Not "did it parse"
but "is this plausible". The concrete vocabulary already exists, in Great
Expectations and dbt tests. The transferable rules for us:

| Assertion | Catches |
|---|---|
| A class value drops by more than N% between consecutive successful refreshes | Polkadot; an expired key that returns a partial answer |
| A total becomes exactly `0` when the previous value was non-zero | The failure-reads-as-zero shape of #289 recurring anywhere |
| A returned row count is exactly equal to a known page size | The pagination shape of #295, generally |
| A field that has been non-null for N days becomes null | Vendor removing a field without removing the key |
| Row count drops while `asOf` advances | Silent truncation |

GX Cloud's shipped anomaly rule is a usable default where we have no better
prior: **flag a deviation of ≥10% from the baseline mean of the last five
runs.** We have `net_worth_daily` already, which is five runs of history sitting
in a table nobody is currently reading for this purpose.

The critical design decision, and the one to get right before writing any of it:
**an invariant violation must not block the write.** A user whose crypto really
did drop 99% (they sold) must still see the truth. The invariant fires an
*alert to us*, not an error to them. Confusing these turns a monitoring feature
into an outage.

**Changelog and deprecation watching.** Verified available today: Plaid at
`plaid.com/docs/changelog/` (200), Zerion at `developers.zerion.io/changelog`
(200). Neither exposes RSS (`plaid.com/docs/changelog/rss.xml` is a 404), so
this is a fetch-and-diff-the-text job, not a feed subscription. Cheap, and a
Zerion changelog entry visible today announces a new `sync` query parameter on
`/wallets/{address}/positions`, the exact endpoint #295 was about.

### Tier 2: real value, moderate cost

**Schema-diff monitoring.** `plaid/plaid-openapi` is live (3.1 MB, 74k lines,
pushed 2026-08-17) and `oasdiff` computes breaking-change diffs between two
spec versions. A scheduled fetch-and-diff against a pinned copy is genuinely
cheap for Plaid. The caveat is coverage: **this works for the vendors that
publish a spec, which is a minority of our 38**, and it detects announced
changes, which is the class of change least likely to hurt us. Polkadot's
migration was announced and we still missed it, so the failure mode this
addresses is "nobody read the announcement", which is real but is a
different problem from silent drift.

**Recorded-fixture replay, made executable.** We already vendor contracts in
`docs/context/` (17 files plus a `vendor-llms/` directory; among them
`plaid.md`, `zerion.md`, `kicksdb-openapi.json`). The brief's question, "could those be executable rather
than documentation", is the right question. The honest answer from the survey:
partially. Recorded fixtures pin *our parsing* against a snapshot, which
protects against our own regressions, and they say nothing about whether the
vendor still sends that shape, because the recording never re-runs against the
vendor. **A fixture is a test of us. A canary is a test of them.** Both are
useful; only the canary answers the question Part B is asking.

### Tier 3: does not earn its place here, yet

**Consumer-driven contract testing (Pact).** Pact's model is bidirectional: the
consumer publishes expectations, the *provider* verifies them in the provider's
own CI. We cannot make Plaid run our Pact verification. Used unidirectionally
it degrades to fixture replay with more machinery. Recommend: no.

**Schemathesis / Dredd.** These are property-based fuzzers for APIs *you own*,
driven from your spec. We own no external API. Recommend: no.

**Auto-adaptation.** The brief already reached this conclusion and the survey
confirms it: "Auto-healing a changed contract is research-grade and probably
unwise." Nothing found argues otherwise. **Detect fast, fail loud, degrade
honestly** is achievable and is almost all of the value.

## B3. The asymmetry worth stating plainly

Our architecture has one property that makes drift *survivable* once detected,
and it is already in place: `GET /api/net-worth` is a pure DB read, and `null`
means unknown while `0` means empty. So the moment we can *detect* drift, the
correct response is already expressible: mark the class `error`, keep the last
good value, exclude it from the total, tell the user its age. We do not need new
degradation machinery. **We need eyes, not hands.**

---

# 3. The circuit breaker, read against the survey

The brief asked for this specifically: the pattern is present but mis-scoped,
which is harder to notice than a missing pattern.

`scheduler/index.ts:279`:

```ts
if (
  row &&
  row.consecutiveFailures >= FAILURE_BACKOFF_THRESHOLD &&   // 5
  row.lastAttemptAt !== null &&
  now.getTime() - row.lastAttemptAt.getTime() < interval
) continue;
```

This is keyed **per (user, class)**. Envoy's outlier detection, which is the
most carefully specified version of this pattern in the field, keys per
**upstream host**, and its `consecutive_5xx` default is **5**, the same number.
Same threshold, inverted axis. The consequences, stated precisely:

**1. Cost scales with users, not with the outage.** A vendor going down costs
`5 failures × every affected user` before anything slows. Envoy ejects the host
once, for everybody.

**2. Per-user keying makes rate-based detection impossible, not just
unimplemented.** opossum's `volumeThreshold` exists because an error *rate* is
meaningless at low volume, and its default rolling window is 10 seconds across
10 buckets. Our per-(user, class) key sees roughly one sample per refresh
interval, so a rate can never be computed. A streak counter is not a
simplification of a rate; at volume 1 it is the only thing available. Fixing the
key is a precondition for every other improvement here.

**3. The counter never decays.** `consecutiveFailures` resets only on success.
opossum and Envoy both bound the observation window in *time*, so an old failure
stops counting. Ours does not, which is one reason gap 4 exists: a connection at
fifty consecutive failures is indistinguishable from one at five, forever.

**4. There is no half-open probe.** After backoff we retry a full unit of work
at full concurrency. Both references send exactly one probe and promote on
success.

**5. There is no ejection cap, and there should be.** Envoy's
`max_ejection_percent` exists so detection cannot take out the whole cluster. A
vendor-level breaker for us needs the equivalent guard: a bug in the breaker
must not be able to stop refreshing everything.

**6. Retries amplify underneath all of it.** `util/fetch.ts` gives every logical
call up to 3 attempts (200 ms, 400 ms, no jitter). Against a dead vendor with N
users that is `3N` requests per sweep, and the breaker only engages after five
*sweeps*. Google SRE's answer is a **client retry budget**: retries are capped
as a fraction of total requests, 10% as a starting point, which holds load
growth at 1.1x instead of 3.5x. Two smaller notes on the same file: the fixed
delays have **no jitter**, which is the textbook thundering-herd setup once more
than one user shares a vendor, and Envoy's `split_external_local_origin_errors`
distinction is worth borrowing, because a local timeout and an upstream 503 are
different evidence about vendor health and we currently count them the same.

**The correct target shape**, synthesising both references: breaker state keyed
per **vendor** (optionally per vendor endpoint), computed over a **time-bounded
rolling window** with a **volume floor**, opening on a **rate**, recovering via
a **single half-open probe** with **exponentially increasing** ejection
duration, capped, and with a **global ejection ceiling**. The existing per-user
backoff can stay underneath it as a second, narrower breaker for the case of one
user's connection being individually broken. The two are not alternatives; they
answer different questions. That is precisely why one of them cannot serve as
both.

---

# 4. Findings against our own code

The handoff listed seven gaps, measured on 2026-08-21. The survey confirms
1, 2, 3, 4, 5 and 7. It **corrects gap 6** and adds one new finding.

### Correction: gap 6, "no proactive repair", is wrong for Plaid

It is built, end to end, and it is good:

- Server-side detection: webhook plus daily reconciliation sweep (A3)
- One transition function both detectors share (`plaid/item-lifecycle.ts`)
- A push on `expiring` / `reauth_required` / `revoked`, routed through
  `dispatchReaction` so quiet hours, the two-a-week budget and the same-type
  cooldown all apply
- Deliberate omission of `healthy` from the push set
- iOS `ConnectionRepairViewModel` plus a `.reauthRequired` row treatment
  carrying a Reconnect affordance and the value's age
- Status carried by label text, never colour alone

The accurate statement of gap 6 is: **proactive repair exists for 1 of 38
integrations, because the lifecycle it depends on exists for 1 of 38
integrations.** That is a much better position to build from, and it means the
work is generalising a proven mechanism rather than designing one.

### New finding: the backend and iOS disagree about whether `reauth_required` counts

Not in the handoff. Found while reading both sides for A1.

`backend/src/networth/classes.ts:179`:

```ts
return status === 'ok' || status === 'stale' || status === 'expiring' || status === 'reauth_required';
```

`ios/Coiny/Models/WealthGroups.swift:170`:

```swift
status == .ok || status == .stale || status == .expiring
```

`reauth_required` is included in the server's `total` and excluded from the iOS
group subtotal, which `NetWorthView+Groups.swift:146` renders as the section
header. The headline number is the server's (R-14.2, correct). So **a user with
a lapsed bank login sees group subtotals that do not add up to their net
worth**, with no footnote explaining the difference: `excluded` will not list
the class either, because the server does not consider it excluded.

This is the exact failure mode the market research warns about, "a visibly wrong
net worth breaks trust in the entire dashboard at once", and it is reachable
today by any user whose bank login lapses. It is small, self-contained, and
should be fixed before any of the larger work. It needs a decision on which side
is right (I think the backend: a lapsed login does not make the last balance
wrong, and A5 says every system surveyed agrees), plus a test that pins the two
`includedInTotal` implementations to each other so they cannot drift again.

---

# 5. Proposed implementation order

Ordered by "what does the next step depend on", not by size. The handoff's
suggested shape was right; this refines it with what the survey found.

**0. Fix the `reauth_required` total mismatch.** Hours, not days. It is a live
user-visible wrongness, it is unrelated to everything below, and it should not
wait behind a research programme. One PR.

**1. Error tracking and alerting.** Everything after this depends on being able
to see a failure. This is the second branch of Maybe's importer, the one we
do not have: the path that tells *us* rather than the user. Unchanged from the
handoff's ordering and the survey only strengthens it, since every technique in
Part B terminates in "and then it alerts someone".

**2. Per-connection health, generalised.** Give `zerion_wallets`,
`coinbase_connections`, `alpaca_connections`, `kraken_connections` and the rest
the columns `plaid_items` already has. This is gaps 1 and 2 together, and it is
the precondition for "prompt the user to fix *this wallet*". Survey input: key
it to the **connection**, and consider Actual's per-account grain for the Plaid
case. Do not add status values.

**3. Attempts as rows.** A `sync_attempts` table replacing
`consecutiveFailures`-as-the-only-record, with Maybe's `stale` state for
attempts a deploy interrupted. This is what makes gap 4 fixable rather than
worked around, and it is what alerting in step 1 will want to read.

**4. Re-key the circuit breaker to the vendor.** Section 3. Add the vendor-level
breaker above the existing per-user backoff, with a volume floor, a rolling
window, a half-open probe and an ejection ceiling. Add jitter to
`util/fetch.ts`'s retry delays and consider a retry budget. Depends on step 3
for the observation history and step 1 for anyone to notice it tripping.

**5. Drift detection: canaries plus invariant assertions.** Section B2 Tier 1.
The cheapest thing that would have caught both #302 and #295. Depends on step 1
only. Could reasonably be pulled ahead of step 4 if the appetite is for catching
bugs over surviving outages, and given we have one user and 38 vendors, that
argument is strong.

**6. Changelog watching, then schema-diff for the vendors that publish specs.**
Tier 1 and Tier 2. Small, independent, and can slot in anywhere after step 1.

**Not recommended:** Pact, Schemathesis, Dredd, auto-adaptation. Section B2
Tier 3 gives the reasoning for each.
