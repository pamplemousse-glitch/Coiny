# Spec methodology

**Status:** Written 2026-08-12 against `docs/prd-app-v2.md` (2026-08-11, reconciled 2026-08-12) and the codebase at commit `d8adad1`, branch `fix/critical-backend-bugs`. Supersedes the 2026-08-12 version written at `1685e84`.
**Answers one question:** is `prd-app-v2.md` good enough to build from, and what has to change first.
**Sibling documents:** `docs/obligations.md` owns which external rules bind this product and who imposes them. `docs/engineering-budgets.md` owns how a quality attribute becomes a measured, verified target. Where a finding below needs one of those, the row names the handoff and stops.

---

## 1. What this spec is for, and what it is not

### 1.1 The verdict on prd-app-v2.md

The decisions in `prd-app-v2.md` are unusually well evidenced and they are holding. Its structure is not holding. In the two days since it was written, the gap between what it says and what the code does has been resolved four separate times, and three of those four resolutions were made silently by an implementing agent rather than by the founder:

1. **The push cap.** The PRD stated three different weekly caps; code shipped 2; the founder reconciled to 2 on 2026-08-12 (`d8adad1`). This one was caught and decided. But the reconciliation was appended as a blockquote inside the §5.6 table, which orphaned the table's last row (`prd-app-v2.md:575-585`), and the same contradiction pattern was left standing in §6.2 vs §6.5 and §8 Q9.
2. **Rung 6's income basis.** The PRD sets rung 6 at "25% gross savings rate" (`prd-app-v2.md:232`). The ladder engine implements it against a take-home-based rate: `monthlySavingsRate` computes `(income - outflow) / income` over categorised inflows, which are net deposits (`backend/src/goals/derived.ts:138-153`), compared against `SURPLUS_SAVINGS_RATE = 0.25` (`backend/src/goals/ladder.ts:200-209, 228`). 25% of gross and 25% of take-home are materially different targets. Nobody decided this. Nothing records that it happened.
3. **Rung 2's unconnected branch.** The PRD says the employer match is "Declared once, verified via 401k contribution stream if snaptrade/Plaid Investments connected" (`prd-app-v2.md:228`) and never says what happens when nothing is connected. The code answered: `employerMatch` is typed as "User-declared" and `'captured'` alone satisfies the rung (`ladder.ts:50-51, 148-153`). Declaration completes a rung that gates pet evolution, with no verification. Possibly correct. Never decided.
4. **Cold start.** The PRD's Layer 0 fields state no behaviour for users with short history. The implementer adopted a principled rule, "null means we do not know, and null is never treated as zero" (`derived.ts:7-10`), and then violated it in the one place it matters most: `monthlyOutflows` divides the trailing 90-day outflow sum by a fixed 3 months regardless of how much history exists (`derived.ts:123`). A user 14 days old gets an `essentialMonthly` understated roughly 6x, so `runwayMonths` overstates 6x and rung 4's emergency-fund target shrinks 6x. Because rungs never un-complete (`ladder.ts:9-14`), the mis-awarded stage would be permanent. Zero production callers today (only tests import `store/goals.ts`), so no user has been harmed, but this ships broken the day the ladder wires up.

That is the state of the document: simultaneously **ahead of the code** (onboarding, debt, target goals do not exist) and **behind it** (the §3.7 schema, the §5.1 deletions, and roadmap items 2, 5 and 6 are already built, and the PRD still instructs an agent to build them). Build from it after the following edits, not after a rewrite.

**Edits required before the 4-week block starts** (each substantiated in §6):

1. Decide rung 5 and 6's income basis: ratify the code's take-home implementation or fix the code to a defined gross derivation. One sentence in the PRD, one register entry (§5.2 below).
2. Add the cold-start column to §3.2 (minimum observation window, value below it, what the UI shows) and fix `monthlyOutflows` to scale by observed history span, not a fixed 3 months.
3. Add a `declared_assets` table to §3.7. Onboarding screen 2 writes values with `confidence: 'declared'` (`prd-app-v2.md:150`) and no table anywhere holds them.
4. Add a null-date and minimum-history rule to §3.4's pace math before any goal CRUD is built.
5. Add a user-timezone requirement. Quiet hours are "user-local" (`prd-app-v2.md:572`) and no timezone exists anywhere in `backend/src` (grep: only `withTimezone` timestamp columns). The dispatcher currently enforces no quiet hours at all (`backend/src/reactions/dispatch.ts:40-64`).
6. Delete the superseded §6.2 price table, fix the free tier at one integer (§6.5 says "2 to 3 connections", `prd-app-v2.md:652`), delete §8 Q9.
7. Merge §5.2 "Energy" and §6A.1 "Rest" into one variable with one name, one driver, one formula.
8. Add a status column to Appendix A and the §7 roadmap, and mark rows already executed (`5c06775`, `61061d4`, `4fab602`, `bbe0c41` collectively completed 4 of Appendix A's 12 rows).
9. Repair the §5.6 table and adopt the register mechanism in §5 of this document so the next reconciliation does not break the next table.
10. Replace inline code-state assertions (still present at `prd-app-v2.md:14, 22, 213, 214, 591, 896-898`) with dated defect references; most are now false.

### 1.2 What each document is for

Three kinds of document, three jobs. Blurring them is how a 915-line file ends up holding a pricing argument, a pseudocode amortization formula, and eleven claims about code that rotted within a day.

| Document | Job | Binding? | Coiny instance |
|---|---|---|---|
| **Product spec** | What we are building and why: decisions, principles, requirements. States desired behaviour only, never current code state. | Yes. Disagreements are settled by it. | `prd-app-v2.md` |
| **Design doc** | How, when the how is expensive to reverse: trade-offs and alternatives. Google's design docs exist for "trade-offs considered", and docs that are mere "implementation manuals" are explicitly called out as waste ([Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)). | Advisory | At team size one, collapse into the build spec except for hard-to-reverse choices: schema, money math, vendor selection. Two sentences on the rejected alternative, not two pages. |
| **Build spec (ticket)** | One agent-executable unit of work with its own verification. 1-3 pages, Google's "mini design doc" size. | Yes, for one session | One per §7 roadmap item, written when the item starts, archived at merge |
| **Defect list / state delta** | What the code does today that the spec says it should not. Dated, ID'd, updated at merge. | Descriptive | The verified context brief's D1-D20 table is the model. The PRD must reference defect IDs, never assert code state inline. |

The threshold for writing anything at all: Spolsky's line is that a spec pays for itself "on any non-trivial project (more than about 1 week of coding or more than 1 programmer)" ([Painless Functional Specifications](https://www.joelonsoftware.com/2000/10/02/painless-functional-specifications-part-1-why-bother/)). Rust requires RFCs only for "substantial" changes and explicitly not for invisible ones ([Rust RFC README](https://github.com/rust-lang/rfcs/blob/master/README.md)). Anthropic draws the identical line for agents: "If you could describe the diff in one sentence, skip the plan" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). Adapted for Coiny: **a build spec for anything touching money math, the pet contract, schema, or notifications; a one-sentence prompt for everything else.**

### 1.3 What this document is not

It does not re-litigate any product decision in the PRD. It does not state security or compliance obligations (`docs/obligations.md`). It does not set performance numbers, cost budgets, or the instrumentation pipeline (`docs/engineering-budgets.md`).

---

## 2. The structure, with a rationale per section

### 2.1 The product spec (what prd-app-v2.md should converge to)

Keep it as one file. The repo carries 17 stale planning documents that root `CLAUDE.md` now explicitly lists as do-not-cite; every additional file is another thing that rots, and Nygard's observation is the operative one: "Large documents are never kept up to date. Small, modular documents have at least a chance" ([Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). One large spec plus small per-item build specs is the compromise that fits one maintainer. The structure:

| Section | Job | Rationale |
|---|---|---|
| **Status header + decisions register** | Date, status, and an append-only table of settled decisions: ID, date, decision, what it supersedes, where implemented (constant or file). | This is the missing organ. The push-cap reconciliation, the rung 6 basis, and the rung 2 branch all needed a row here; instead one became a table-breaking blockquote and two were never recorded at all. Nygard's ADR shape (context, decision, status, consequences, one page, superseded-never-edited) is the proven format; a one-row-per-decision table is its solo-scale reduction. |
| **One-page argument** | Why this product, what it displaces. | PRD §0 does this well. It is Amazon's press-release forcing function. One page, and **zero code claims**: §0 currently asserts four things about the code (`prd-app-v2.md:14, 22`) of which two are already false. |
| **Positioning: promise, users, anti-targets, voice, principles** | The adjudication layer. When two requirements conflict, the principles decide. | PRD §1.9 principle 5, "Precision or silence", mechanically generates every cold-start rule §3 is missing. A principles section earns its place only if later sections actually cite it. |
| **Mechanics, as numbered requirements** | The normative core. Every requirement carries an ID (R-3.4.2), a testable statement (§3 below), and a verification method. | The Rust RFC template separates guide-level from reference-level explanation because prose that teaches and text that binds serve different readers; RFC 2094 additionally carries an appendix titled "What this proposal will not fix" ([RFC 2094](https://github.com/rust-lang/rfcs/blob/master/text/2094-nll.md)). In the PRD, §3.1's evidence commitments are guide-level and §3.4's field list is reference-level; both belong, labelled. |
| **Explicit undefined behaviour** | Where the spec deliberately does not constrain, it says so. | PEP 634 marks its own gaps: "This behavior is therefore undefined and user code should not rely on it" ([PEP 634](https://peps.python.org/pep-0634/)). This matters double for an agent audience, because to an agent, silence and delegation are indistinguishable: every one of the four silent resolutions in §1.1 happened in a place where the PRD was silent rather than explicitly delegating. Write "implementer's choice, record it in the register" where that is the intent. |
| **Non-goals** | What was considered and excluded, with the reason. | PRD §1.6 anti-targets and §6A.5 never-build are already exemplary. |
| **Open questions, each with an owner and a resolution trigger** | Questions only the founder can answer. | PRD §8's question + recommendation pattern is right. Add: an answered question moves to the register the day it is answered. Q9 has been answered since 2026-08-11 and still stands as a live recommendation for a dead price. |
| **Research caveats appendix** | Numbers in circulation that failed checking. | PRD Appendix B is the best hygiene practice in the document. Keep it forever. |
| **File-change appendix with a status column** | The agent's worklist. | PRD Appendix A is precisely what an agent needs and it is now one-third executed with no way to know which third. A table that cannot record completion instructs redundant work forever. |

### 2.2 The build spec (one per roadmap item)

Written when the work starts, executed in a fresh session, archived when merged. Anthropic states the contract exactly: "The most useful specs are self-contained: they name the files and interfaces involved, state what is out of scope, and end with an end-to-end verification step that proves the feature works" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). The template:

```
# Build: <roadmap item>
Preamble: verify current code state before acting on any claim below.
  The spec describes desired behaviour; the defect list describes today.
Goal (one paragraph)
Requirements implemented: R-x, R-y (copied in, not referenced)
Data definitions, including value-when-history-is-insufficient
Files to touch
Out of scope (explicit, or the agent drifts into Appendix A's other rows)
Approach + the alternative rejected, two sentences
Ambiguity rule: if the spec is silent on behaviour you are about to
  implement, stop and ask. If running unattended, take the conservative
  option, mark the site `// SPEC-GAP: <question>`, list it in the PR body.
Verification: named test cases, the command to run, one end-to-end check
  ("app.inject POST /api/goals with a dateless goal returns pace: null"),
  and show the output, not an assertion of success.
```

### 2.3 Elicitation: where requirements come from, in order of cost

1. **The agent interviews you.** For any feature bigger than a sentence: "Interview me in detail using the AskUserQuestion tool... dig into the hard parts I might not have considered. Keep interviewing until we've covered everything, then write a complete spec" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). This is the cheapest structured elicitation available to a solo founder, and it is precisely the step that would have surfaced the cold-start, null-date and timezone questions this audit keeps finding.
2. **The press-release paragraph.** Before any genuinely new surface (Household, hardware re-entry), write the PR/FAQ's one-page press release first: heading, customer, problem, solution, one hypothetical customer quote ([Working Backwards](https://workingbackwards.com/concepts/working-backwards-pr-faq-process/)). If the customer quote is unwritable, the feature is not understood yet.
3. **The 30 testers.** Post-TestFlight, tester friction reports become the requirement source. Route them through the interview step so they arrive as testable statements, not vibes.

### 2.4 Sequencing, and where rigour stops paying at team size one

The PRD sequences well: one build spec in flight at a time, in §7's stated order. The dependency argument for `net_worth_daily` first still holds; note that the table and its store now exist (`backend/src/db/schema.ts:615-628`, `store/goals.ts`) and what is missing is the nightly job, and there is no scheduler of any kind in the codebase (context brief D3). The job itself is an engineering-budgets concern; the spec's job is to say what a snapshot contains, which §3.7 does.

Where rigour stops: the evidence is this repo's own history. Four spec-code divergences in 48 hours says the binding constraint is not writing more spec, it is keeping one spec true. At team size one with an agent shipping daily, **document freshness beats document completeness**, and the practices worth having are exactly the ones that are cheap to keep true:

- **Do now:** requirement IDs, verification methods, one source of truth per number, the decisions register, cold-start rules, explicit undefined-behaviour marks, build specs per roadmap item, status columns.
- **Do not do:** traceability matrices, review boards, comment periods, sign-off ceremonies, estimation rituals. Each assumes writer and reader are different people. §8 states the trigger at which each becomes real.

Two calibration points from organisations that ship. Shape Up deliberately specifies at the "fat marker" altitude because over-specified work removes the builder's judgment and under-specified work opens rabbit holes ([Shape Up ch. 3](https://basecamp.com/shapeup/1.2-chapter-03)); the agent-era translation is that altitude varies by section, see §4.5. And Anthropic's own shipped spec-for-agents guidance warns that "if you find yourself writing ALWAYS or NEVER in all caps, or using super rigid structures, that's a yellow flag", preferring to "explain the why behind everything you're asking the model to do" ([skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)). The PRD's citation density is its version of explaining the why, and it demonstrably works: the four silent resolutions were all *reasonable*, they were just *unratified*. Rationale gets an agent near the intent; only precision keeps two near-intent choices from diverging.

### 2.5 Validation: how a spec is checked before building from it

Four checks, all cheap. Where the PRD stands on each today:

1. **The stranger test.** Ask the agent, in plan mode, to list every question it would need answered before implementing a section. Its questions are the spec's holes. (The four silent resolutions in §1.1 are the questions that were never asked.)
2. **The duplicate-number grep.** Every number stated twice must match. The PRD now passes on the push cap and fails on price ($59 at `prd-app-v2.md:609, 877` vs $99 at line 653) and free-tier connections (2 at line 610 vs "2 to 3" at line 652).
3. **The cold-start pass.** For every computed field: what is this on day one, with zero history? The PRD still fails on at least five fields, and the code's improvised answers now need ratifying or fixing (§6 rows for §1.7, §3.2, §3.4).
4. **Adversarial review after building.** "Use a subagent to review the... diff against [the spec]. Check that every requirement is implemented... and nothing outside the task's scope changed. Report gaps, not style preferences" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)), with the reviewer told to flag only correctness gaps, since a reviewer asked for findings will always produce some.

---

## 3. Making a requirement testable

**The rule:** a requirement is testable when a person or agent who did not write it can construct a check that fails today and passes when the requirement is met, using only the words in the requirement. In practice: every noun is defined, every number has a unit and a measurement window, every computation states its value when its inputs are absent, and the sentence names an observable response of a named system.

The sentence shape that enforces this is EARS, developed at Rolls-Royce for jet-engine control requirements and adopted by Airbus, Bosch, Intel and NASA: "While <precondition>, when <trigger>, the <system> shall <response>", with an If/Then form for unwanted behaviour ([EARS](https://alistairmavin.com/ears/)). Full EARS across a product spec is ceremony; use it wherever money math, notifications, or the pet contract are stated, because those are the places an agent must not improvise.

Six before/after pairs, each quoting an actual line of `prd-app-v2.md`:

**Pair 1, §1.10 line 116 (the north star):**
- *Before:* "the percentage of signups who complete a foundation-ladder rung or a habit-goal period within 4 weeks of signup, and are still active in week 4."
- *Why it fails:* "active" is undefined, and nothing that exists can compute any term of it: zero analytics exist in backend or iOS (context brief D9, grep-confirmed for posthog/amplitude/mixpanel/segment/sentry/otel). The 25% target at line 122 is uncomputable by anything the §7 roadmap schedules.
- *After:* "W4 = signups whose `ladder_rung_completed` or `goal_period_passed` event fires within 28 days of `signup_completed`, AND who make at least one authenticated app-originated API request during days 22-28. Verification: a weekly query over the events table. The event pipeline is a launch-blocking dependency, owned by `docs/engineering-budgets.md`; this spec owns the definition."

**Pair 2, §2.3 line 144 (time to first value):**
- *Before:* "Time-to-first-value target: the net worth number on screen in under 90 seconds."
- *Why it fails:* no start point, no end point, no population, no instrument.
- *After:* "When a new user completes sign-in, the app shall render the assembled net worth number within 90 seconds of `signup_completed`, measured as the median of `net_worth_rendered - signup_completed` across the first 30 TestFlight testers. If the median exceeds 90s, onboarding screens are cut until it does not. Verification: both timestamps exist as analytics events (pipeline: engineering-budgets)."

**Pair 3, §3.2 line 209 (essential spend, the cold-start killer):**
- *Before:* "`essentialMonthly`: Trailing 90d mean of outflows in rent, mortgage, utilities, insurance, loan_payment, groceries, transport."
- *Why it fails:* no minimum-history rule, so the implementer had to invent one, and invented division by a fixed 3 months regardless of history span (`derived.ts:123`). A 14-day-old account reports `essentialMonthly` about 6x low, `runwayMonths` about 6x high, and a rung 4 target about 6x too easy, and a mis-awarded rung is permanent by design (`ladder.ts:9-14`). Also "transport" is not a category the pipeline produces: the stored taxonomy splits it into `transportation`, `transit`, `gas_stations` and adds `medical` (`backend/src/goals/categories.ts:25-36`), so the spec's category list and the code's have already diverged.
- *After:* "While fewer than 60 days of transaction history exist on the user's connected depository accounts, `essentialMonthly` shall be null, and every consumer shall render its no-data state. While 60 or more days exist, `essentialMonthly` shall be the sum of outflows in the categories enumerated in `goals/categories.ts` `ESSENTIAL_CATEGORIES` (that file is the single source of truth for the list) over the trailing min(history, 90) days, scaled by 30/observed-days. Verification: unit tests at 0, 30, 59, 60 and 200 days of fixture history asserting null, null, null, scaled-by-2-months, scaled-by-3-months."

**Pair 4, §3.3 line 232 (the silently-resolved income basis):**
- *Before:* "Surplus: 25% gross savings rate sustained 3 consecutive months."
- *Why it fails:* gross income is derived nowhere. Layer 0 produces `takeHomeMonthly` only (`prd-app-v2.md:207`), Plaid inflow streams are net deposits, and the code has already resolved the ambiguity one way without a decision: `monthlySavingsRate` is take-home-based (`derived.ts:138-153`) against `SURPLUS_SAVINGS_RATE = 0.25` (`ladder.ts:228`). Rung 5 has the same defect one layer up: "15% of gross" (`prd-app-v2.md:231`) is implemented as `taxAdvantagedRate` compared to 0.15, where `taxAdvantagedRate` is documented only as "Annualised rate currently going into tax-advantaged accounts, 0 to 1" (`ladder.ts:48-49`), rate of what unstated, and **no code anywhere produces it**.
- *After:* "Rungs 5 and 6 are computed on take-home. Rung 6: `monthlySavingsRate` (as defined in Layer 0, take-home basis) at or above 0.25 for 3 consecutive calendar months. Rung 5: tax-advantaged contributions detected in the trailing 3 months, annualised, divided by `takeHomeMonthly x 12`, at or above the user-set rate, default 0.15; while no investment connection exists and no contribution stream is detectable, the rung is indeterminate and the UI says what connecting would unlock. Register entry: 'gross' in the published framework figures becomes 'take-home' here, deliberately, because we can measure it; the displayed copy says 'of what you take home'. Verification: unit test with fixtures at 0.24/0.25/0.26 across month boundaries; unit test that a missing contribution stream yields indeterminate, not failed."

**Pair 5, §3.4 lines 253 and 263 (run-rate math):**
- *Before:* "`target_date (nullable)`" and "`requiredRunRate` = `(target_amount - current) / months_remaining`", with `pace`, `projectedDate` and `gapAction` (lines 265-267) all consuming the quotient.
- *Why it fails:* `months_remaining` does not exist for a dateless goal. The spec authorises a null it never handles, the classic divide-by-undefined an agent papers over with `?? 0`, rendering every dateless goal permanently "Off pace" (<0.5). Separately, `actualRunRate` is a "trailing 90-day mean net contribution" (line 264) to an account that may be days old, so every young goal computes pace against near-zero history and is born "Off pace" on the flagship screen.
- *After:* "While `target_date` is null, `requiredRunRate` and `pace` shall be null and the goal shall render contribution history only. While `target_date` is set, `requiredRunRate` = `(target_amount - current) / months_remaining`, where `months_remaining` is the fractional month count from computation date to `target_date`, floored at 0.25. While fewer than 30 days of contribution history exist on the funding account, `pace` shall be null and the UI shall read 'too early to say'. Verification: unit tests for null date, past date, a date 3 days out, and a 10-day-old funding account."

**Pair 6, §5.6 line 572 (quiet hours):**
- *Before:* "Quiet hours: 21:00 to 08:00 user-local, no exceptions."
- *Why it fails:* "user-local" names a datum the system does not possess (no timezone field anywhere in `backend/src`), and the dispatcher enforces no quiet-hours check at all: `fanOutPush` gates only on the animation allowlist, the 7-day budget and the same-type cooldown (`dispatch.ts:40-54`, `store/notifications.ts:21-41`). The same table's "Maximum per day: 1" (line 570) is also unenforced: two different event types can push twice in one day within the weekly budget of 2.
- *After:* "The device registration payload shall include the device's IANA timezone identifier, stored per device token. When evaluating quiet hours, the dispatcher shall use the timezone of the most recently registered device. If no timezone is stored for any of a user's devices, then the dispatcher shall suppress the push and log `quiet_hours_unknown_tz` rather than guess. The dispatcher shall also enforce a per-day maximum of 1. Verification: dispatcher unit test with a fixture token in Asia/Tokyo asserting suppression at 22:00 Tokyo time and delivery at 09:00; test asserting the second same-day push of a different event type is suppressed."

The deletion corollary: **a requirement whose verification method cannot be stated is deleted or demoted to prose.** "Precision or silence" (§1.9) survives as a principle because principles adjudicate rather than bind. "Sliders are the difference between 20 seconds and abandonment" (line 150) is rationale, fine as prose. "Energy: driven by app opens and user actions" (`prd-app-v2.md:505`) sits in a normative table with no formula and no test; it becomes a formula or leaves the table.

---

## 4. Writing for an AI coding agent

The audience changes the failure modes, not the standards. A human implementer asks about gaps; an agent fills them fluently, and this repo now has four worked examples of exactly that (§1.1). Five rules.

### 4.1 State desired behaviour, never current code state

The PRD asserts code facts as motivation: "counts *any* credit over $50 as income" (`prd-app-v2.md:213`), "Only a scalar exists. No time series" (line 214), "`dispatch.ts` currently fans out a push for **every** reaction" (line 591), plus roadmap items 2, 5, 6 and Appendix A rows 896-898 instructing the fixes. All were true on 2026-08-11. All are false at `d8adad1`: income is gated on `INCOME_CATEGORIES` (`store/transactions.ts:119`, commit `5c06775`), `net_worth_daily` and the whole goal schema exist (`db/schema.ts:615-728`, commits `61061d4`, `4fab602`), and pushes sit behind an allowlist plus a budget (`dispatch.ts:10, 42-43`). An agent reading the PRD today is instructed to build four things that already exist, and nothing in the document can tell it so. Rule: the spec states the desired end state; today's divergences live in the defect list with IDs and dates; build specs open with "verify current state before acting."

### 4.2 One source of truth per number

Agents grep, and every duplicated number is a coin flip over which copy gets implemented. Verified live instances: Plus is $59 (`prd-app-v2.md:609`, again at 877) and $99 (line 653); free-tier connections are 2 (line 610) and "2 to 3" (line 652). The push cap shows the failure of the alternative fix: §6.2 was "retained for its reasoning" with a note that §6.5 wins (lines 602-605), but an agent matching a table row does not read the note above it. The rule: a number lives in exactly one place, every other mention is a section reference, and the superseded copy is deleted, not annotated. For numbers that exist in code, the one place is the code, see §5.1.

### 4.3 Give every requirement an ID and every build spec a check

IDs (R-3.4.2) let a session be scoped to "implement R-3.4.1 through R-3.4.4, nothing else", let a test name what it verifies, and let the adversarial reviewer check coverage requirement by requirement. The check is the more important half: "Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). This repo is unusually well set up for it: real-SQL tests via PGlite, `app.inject()` for HTTP, 864 passing backend tests, and pure functions with injected clocks in the goals code (`derived.ts:158-160`). Every build spec ends with named test cases and one end-to-end assertion, and the agent shows the test output rather than asserting success.

### 4.4 Keep every CLAUDE.md true, not just the root one

The root `CLAUDE.md` was fixed at `d8adad1` and is now exemplary: canonical docs first, an explicit do-not-cite list for the seventeen stale ones. Do not re-litigate it. But the fix missed the child file: `backend/CLAUDE.md` still says the backend is "Deployed on Fly.io (Sydney)" while `fly.toml` says `primary_region = 'iad'`, claims "56 Vitest tests" against 86 test files and 864 passing tests, and says migrations live in `migrations/` when they live in `backend/drizzle/` (36 files). Child CLAUDE.md files load automatically whenever the agent reads files in that directory, so every backend session ingests three false facts. Same pruning standard as the root: "For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)), and the same freshness rule as the spec: a claim that can rot needs an owner or it needs deleting.

### 4.5 Precision where choices diverge, freedom where they converge

Anthropic's shipped guidance for writing agent-executable instructions pulls in the opposite direction from EARS: keep it under 500 lines, "explain the why", and treat all-caps ALWAYS/NEVER as a yellow flag ([skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)). Both are right, at different altitudes, and Shape Up's fat-marker argument is the reconciliation: specify at the altitude where getting it wrong is expensive. For Coiny that gives a two-register spec. **Register one, EARS-precise:** money math, thresholds, the pet contract, notification rules, schema. These are places where two reasonable choices produce materially different products (gross vs take-home) or user harm (a 3am push). **Register two, why-plus-constraints:** copy tone, screen layout, animation feel, where the PRD's citations and voice table already give an agent everything it needs and rigid wording would only fight the design direction. The PRD mostly has this balance right; its failures are register-one sections written in register-two prose.

Session discipline around both: one build spec, one fresh session ("Once the spec is complete, start a fresh session to execute it"), plan mode for anything multi-file, adversarial subagent review of the diff against the build spec before merge, and after two failed corrections on the same issue, clear and rewrite the prompt rather than correcting a third time ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).

---

## 5. Keeping the spec true as code moves

The failure is no longer hypothetical and no longer singular. The record, all verified against source:

| When | What drifted | How it was handled |
|---|---|---|
| 2026-08-11, within 24h of writing | PRD's push cap stated as 3, "twice a week", and unstated; implementer shipped 2 (`store/notifications.ts:9`) | Caught 2026-08-12, settled at 2, but recorded as a blockquote pasted inside the §5.6 table, orphaning its last row (`prd-app-v2.md:575-585`) |
| 2026-08-11, same day | PRD's income fix, market-reaction deletions, push budget (roadmap items 2, 5, 6) landed in `5c06775` and later `bbe0c41` | PRD text never updated; still instructs the fixes today |
| 2026-08-12 | Goal schema + ladder engine landed (`61061d4`, `4fab602`), resolving rung 6's income basis, rung 2's verification branch, and every cold-start question, silently, in code comments only | Nothing in the PRD records any of it; §3 still opens "this is... the thing that does not exist today" (`prd-app-v2.md:189`) |
| 2026-08-12 | The cold-start resolution itself contains a defect (fixed 3-month divisor, `derived.ts:123`) that no spec text exists to catch | Undetected until this audit |

Aspirations ("keep docs updated") do not survive contact with a daily-shipping agent. The mechanism, five parts, each mechanical:

### 5.1 Numbers live in code; the spec names the constant

For any value that exists in code, the code is the single source of truth and the spec references it by name: "the weekly push budget is `PUSH_MAX_PER_WINDOW` in `store/notifications.ts`; the onboarding copy must match it." The house style already does the hard half, rationale-bearing doc comments on named constants (`PUSH_MAX_PER_WINDOW` with the onboarding-promise reasoning, `notifications.ts:5-9`; `STARTER_BUFFER_USD` citing the PRD's JPMorgan basis, `ladder.ts:81-83`; `HIGH_APR_THRESHOLD` with its arithmetic argument, `ladder.ts:76-79`). A constant cannot contradict itself, and a test can pin it (`expect(PUSH_MAX_PER_WINDOW).toBe(2)` with a comment naming the register entry). The spec keeps only the decision and its why.

### 5.2 A decisions register, append-only, at the top of the PRD

One row per settled decision: ID, date, decision, supersedes, where implemented. ADR discipline at solo scale: superseded entries are marked, never edited ([Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). The push-cap reconciliation becomes row DR-1 retroactively; the rung 6 basis and rung 2 branch become DR-2 and DR-3 the day the founder ratifies or reverses them. The register is also where §8's open questions go to die: answered question, register row, question deleted. Rule for edits: when a decision changes a number, the number is edited in place at its single home and the old value survives only in the register. The blockquote-in-a-table pattern is banned; it broke the table it annotated and left the two §6 contradictions standing.

### 5.3 The ambiguity stop rule, in CLAUDE.md where the agent always reads it

Add to root `CLAUDE.md`: "When the spec is silent or self-contradictory on behaviour you are about to implement, stop and ask. The answer becomes a decisions-register row before the code merges. If running unattended: take the conservative option, mark the site `// SPEC-GAP: <question>`, and list every SPEC-GAP in the PR body." This converts the silent-resolution failure mode into a greppable artifact: `grep -rn "SPEC-GAP" backend/src ios/` is the drift report. The rung 6 implementer, under this rule, ships the same code plus one comment and one PR line, and the founder decides in ten seconds instead of never.

### 5.4 Spec edits ride in the implementing PR

A PR that implements a spec section edits that section's status in the same diff: Appendix A gains a status column and the row flips to `done <commit>`; a roadmap item gets a checkmark; a resolved defect gets its date. Atomicity is the whole mechanism: doc and code change together or the doc is presumed stale. This is the one habit that would have prevented every row of the failure table above, and it costs one file touch per PR. Enforcement at solo scale is a checklist line in the PR template; if a second contradiction slips through, promote it to a PreToolUse-style hook or CI check that blocks merges touching `backend/src/goals/`, `reactions/`, or `store/notifications.ts` unless `docs/prd-app-v2.md` or the defect list changed in the same diff. Crude, and crude is fine.

### 5.5 A two-minute doc lint, then automate on second failure

Hand-run now, script when it fails twice (the trigger discipline of §8): (a) the duplicate-number grep across `docs/prd-app-v2.md` for every price, cap, threshold and rung target; (b) `grep -nE '(backend|ios)/[A-Za-z/+.]*\.(ts|swift):[0-9]+' docs/prd-app-v2.md` must return nothing, because file:line claims belong in the defect list; (c) `grep -n $'\u2014' docs/*.md` (the em dash) must return nothing (repo constraint); (d) every `§` cross-reference resolves. Items b and c are one-line CI steps with no new dependencies when the time comes.

What this buys: the spec stops claiming things that rot (5.1, 5.4), drift becomes visible instead of silent (5.3), contradictions get caught at edit time (5.5), and there is exactly one place to look for what was decided (5.2). Total ongoing cost is one PR-template line, one CLAUDE.md paragraph, and a register table.

---

## 6. Gap analysis of docs/prd-app-v2.md

Line numbers refer to `prd-app-v2.md` (915 lines) as read on 2026-08-12; code references verified against `d8adad1` the same day. Verdicts: **sound** (build from it), **thin** (buildable but the agent must invent something), **missing** (a needed piece is absent), **unfalsifiable** (cannot be verified as written). Severity per the shared four-level scale, assigned from consequence.

| Section | Verdict | Severity | Evidence | Action |
|---|---|---|---|---|
| §0 The argument | Sound as argument, rotting as record | MAJOR | Inline code claims, no as-of mechanism: "`evaluate()` returns on the first match" (line 14) is still true (`rules/engine.ts:11-18`); "the entire goal system is four integer columns" (line 14) is false since `61061d4`; "it is currently violated. `evaluateExternalEvent` fires `crypto_price_surge`..." (line 22) is false since `5c06775` (`reactions/external.ts:11` documents the deletion); "~830 passing tests" is 864. An agent is instructed to fix bugs that no longer exist, on the product's core mechanics. | Strip code claims from §0 entirely; move current-state deltas to a dated defect list per §5 of this document. |
| §1.1-1.6, 1.8-1.9 Positioning | Sound | none | Promise, archetypes, anti-targets, voice table and five locked reaction lines (lines 94-103) are decision-grade and executable as copy. Principle 5 ("Precision or silence", line 112) mechanically generates the cold-start rules §3 lacks. | None structural. |
| §1.7 Magic moment | Unfalsifiable on its own showcase path | MAJOR | Line 72 promises, 90 seconds post-signup: "At your current pace that is nine weeks." Pace requires contribution history; §3.4 line 264 defines `actualRunRate` over a trailing 90-day window, and the account was connected under two minutes earlier. The flagship sentence is undefined at the only moment it is specified to appear. | Specify the zero-history variant ("You are $1,340 away", no pace clause) and the upgrade trigger (30 days of history on the funding account), per Pair 5. |
| §1.10 North star | Unfalsifiable | MAJOR | W4 (line 116) hinges on "still active in week 4", undefined, computed over events no system emits (D9: zero analytics, backend and iOS). The 25% target at 1,000 users (line 122) is uncomputable by anything §7 schedules. | Adopt Pair 1's definition; add instrumentation to the 4-week block as a named dependency on `docs/engineering-budgets.md`. |
| §2 Onboarding | Thin in one load-bearing place | MAJOR | Screen 2 stores values "with `confidence: 'declared'`" (line 150) and no table holds them: §3.7 (lines 324-331) has no declared-assets table, the schema at `d8adad1` has none (grep "declared" over `db/schema.ts`: zero hits), and Appendix A's schema row (line 895) adds only `debt_accounts`. The most important screen in the product writes to a table that exists nowhere. The push-cap half of the old finding is fixed and not re-reported. | Add `declared_assets` (user_id, asset_class, bucketed_value_usd, confidence, declared_at, refreshed_at) to §3.7. |
| §3 opening + §3.1 Commitments | Sound, one stale sentence | MINOR | "the thing that does not exist today" (line 189) is now one-third false: schema, ladder engine and derived substrate exist unwired (D10). The five commitments each carry a citation and visibly constrain a later mechanic. | Fix the sentence; state what exists and what is unwired, by defect ID. |
| §3.2 Layer 0 | Thin: cold-start unstated, and the code's improvisation contains a defect | MAJOR | No field states its value under short history (lines 207-214). The implementer adopted null-means-unknown (`derived.ts:7-10`, `MIN_MONTHS_FOR_VOLATILITY = 3` at line 17) but `monthlyOutflows` divides by a fixed 3 months regardless of history span (`derived.ts:123`), understating `essentialMonthly` ~6x for a 14-day user, overstating `runwayMonths` ~6x, and shrinking rung 4's target ~6x; rungs never un-complete (`ladder.ts:9-14`), so the mis-award is permanent. `takeHomeMonthly`'s median includes the current partial month (`derived.ts:68-98, 169-170`). Category names diverge: spec says "transport" (line 209), code stores `transportation`/`transit`/`gas_stations` plus `medical` (`categories.ts:25-36`). Unwired today; live the day the ladder wires up. | Add the fourth column per field (minimum window, value below it, UI state). Fix the divisor to observed-history scaling per Pair 3. Exclude the current partial month from the income median. Make `categories.ts` the named single source of truth for category lists. |
| §3.3 Foundation ladder | Thin at rungs 2, 5, 6; two silently resolved, one dangling | MAJOR | "15% of gross" (line 231) and "25% gross" (line 232) are implemented take-home-based (`derived.ts:138-153`, `ladder.ts:189-192, 200-209, 228`) with no decision recorded. Rung 5's input `taxAdvantagedRate` has no producer anywhere and its denominator is unstated (`ladder.ts:48-49`). Rung 2's unconnected branch was resolved to declaration-alone-completes (`ladder.ts:50-51, 148-153`), unratified, and it gates pet evolution. Unknown volatility was resolved to a conservative 6 months (`ladder.ts:108-113`), a good invention that is spec nowhere. Rung 1 conflates null and zero (`?? 0`, `ladder.ts:138`), harmless only because the $2,000 floor dominates. | Founder ratifies or reverses each resolution; each becomes a register row; PRD restates rungs 5-6 on take-home (or defines gross) per Pair 4; define `taxAdvantagedRate`'s derivation or mark rung 5 indeterminate-until-connected. |
| §3.4 Target goals | Unfalsifiable at the edges | MAJOR | `target_date` nullable (line 253) yet `requiredRunRate` divides by `months_remaining` (line 263), consumed by `pace`, `projectedDate`, `gapAction` (lines 265-267). `actualRunRate` (line 264) over 90 days renders every young goal "Off pace" from birth. No goal CRUD exists yet, so the invention is still preventable. | Pair 5's rules, before any goal CRUD is built. |
| §3.5 Habit guardrails | Sound | MINOR | Period, default, data source and an Exists? column per row (lines 284-292); streak mechanics numeric and sourced (line 297). The savings-rate floor consumes a definition that now exists twice: display-percentage (`store/transactions.ts:124-125`) and substrate-fraction (`derived.ts:186-190`), deliberately distinguished in code comments. | Reference the Layer 0 fraction by name so guardrail and substrate cannot drift. |
| §3.6 Portfolio guardrails | Sound | none | Every threshold is a number with a citation and a named data source (lines 307-316); pet exclusion explicit (line 318). Whether the observation-versus-advice line holds legally is `docs/obligations.md`'s half; the mechanics here are testable. | None structural. |
| §3.7 Schema | Thin, and now behind the code | MINOR | Fields given for `net_worth_daily` only (line 328). All six tables now exist (`db/schema.ts:588-728`) plus `derived_state` (lines 633-646), which the PRD list omits. Divergence: PRD says `unlocked_cosmetics[]` (line 329), code says `unlocked_artifacts` (`schema.ts:727`), consistent with §6A.3 but recorded nowhere. `debt_accounts` and `declared_assets` still absent from both. Migration 0035 landed; constraint 13 (monotonic journal dates) applies to whatever comes next. | Reconcile §3.7 against the merged schema, add the two missing tables, and mark the list authoritative-by-reference to `schema.ts` rather than duplicating fields. |
| §3.8 Information architecture | Sound | none | Four tabs, one change each, one explicit removal (line 348). No PlanView exists yet in `ios/Coiny/Views/`, which is correct sequencing, not a gap. | None. |
| §4 Debt | Sound, two ambiguities | MINOR | Dedupe match key and source precedence stated (line 366); the payoff formula ships its own validity guard, `requires P > r * B` (line 413), exactly the discipline §3.2 lacks. Ambiguity 1: Blend step 2 promotes any debt clearable "in <= 3 months at the current extra-payment amount" (lines 394-395) without saying whether the full extra payment is hypothetically concentrated on the candidate. Ambiguity 2: §4.6's "projected utilization" (line 445) never defines the projection. Nothing is built, so both are still cheap. | State both: promotion test concentrates the full extra payment on the candidate; projected utilization = latest synced balance / limit with a staleness bound on "latest" (the bound's number belongs to engineering-budgets). |
| §5.1-5.5 Reaction model | Sound, now half-stale | MINOR | The controllability taxonomy (lines 477-483, 521-547) is enforceable as written. The required deletions are done: crypto events removed, `net_worth_milestone` and `credit_score_*` return null with the reasoning in comments (`external.ts:11, 92-108`, commits `5c06775`, `bbe0c41`); do not re-report. Still open from §5.1's list: `new_liability` "soften" is not done, it still returns concerned/warning/amber (`external.ts:83-90`); the Wealth-tab card that replaces the deleted reactions exists nowhere. `evaluate()` still returns first match (`engine.ts:11-18`), so the §5.4 engine fix stands. §5.2's Vitality has no weights and Energy no formula (lines 504-505). | Track `new_liability`, the Wealth card, and the engine fix as defect IDs. Specify Vitality's weights (proposed: last 4 weekly periods, 4:3:2:1) and Energy's accrual, or demote Energy per §3's corollary. |
| §5.6 Notifications | Thin: two rows unimplemented, one unimplementable | MAJOR | The cap is reconciled at 2 in spec and code, do not re-report. Remaining: "Maximum per day: 1" (line 570) is unenforced, `canSendPush` checks only the 7-day budget and same-type cooldown (`store/notifications.ts:21-41`); quiet hours (line 572) are unenforced and unimplementable, no user timezone exists anywhere in `backend/src`; the digest (line 573) has no scheduler to run it (D3). The reconciliation blockquote (lines 575-584) orphans the table's final row (line 585), so a markdown-parsing agent loses the re-engagement timing rule entirely. A 23:00 push to a tester is a trust cost inside the first 30. | Repair the table. Add timezone capture per Pair 6. Add the per-day check. Digest scheduling depends on the scheduler that engineering-budgets owns. |
| §6 Monetization | Contradictory | MAJOR | Two price tables coexist: $59/$149 (lines 607-619) and $99/$169 (lines 651-654), with a prose note (lines 602-605) an agent matching table rows will not read. Free tier is "2" connections (line 610) and "2 to 3" (line 652); a tier limit cannot be a range. Q9 (lines 877-878) still recommends $59, dated the same day as the $99 lock. The paywall is a 3-month-block item, so this is the next silent resolution waiting to happen. | Delete the §6.2 table, keep §6.3's reasoning prose. Fix free at one integer. Delete Q9 into the register. |
| §6A Game mechanics | Sound, one structural duplication | MAJOR | §6A.1 (lines 736-740) restates §5.2's state model with the third variable renamed: Energy, "app opens and user actions" (line 505) versus Rest, "whether anything needs doing" (line 740). Same slot, different name, contradictory driver, and the code's comment introduces a third reading: vitality and rest "are computed, not stored" (`schema.ts:718-720`). An agent implementing §5 then §6A builds the pet's face twice. §6A.5's never-build table is exemplary. | One table, one name, one driver, one formula, in §5.2; §6A references it. Record which driver won in the register. |
| §7 Roadmap | Sound sequence, no completion mechanism | MAJOR | The 4-week bar is a real end-to-end check (line 801). But items 2, 5 and 6 are done (`5c06775`, `bbe0c41`) and item 1 is half-done (table and store exist, `schema.ts:615-628`; the nightly job does not, and no scheduler exists, D3), with nothing recording any of it. The very next agent session pointed at §7 re-does finished work on the product's most sensitive code. Missing entirely: the instrumentation item that §1.10 depends on. | Status per item, updated in the implementing PR per §5.4. Add instrumentation to the 4-week block. |
| §8 Open questions | Sound pattern, one dead question | MINOR | Question + recommendation + rationale is right, and Q6's willingness to override the founder is worth keeping (and is now moot: the deletions shipped). Q9 is answered and actively misleading. Q2 and Q12 have recommendations but no recorded decision. | Delete Q9. Answered questions move to the register the day they are answered. |
| Appendix A | Sound content, no status mechanism | MAJOR | The file-by-file table is exactly what an agent needs and is now one-third executed: the `transactions.ts` row (line 896), the `external.ts` row (897), the `dispatch.ts` row (898) and most of the schema row (895) landed across `5c06775`-`4fab602`. Nothing in the table can say so. | Add a status column; flip rows in the implementing PR per §5.4. |
| Appendix B | Sound | none | Three contested numbers, each with the trace of why it failed checking. The best hygiene in the document. | Extend whenever a number fails checking. |

---

## 7. What to cut

Cutting is a spec-quality action, not a product decision. Each removal deletes a source of agent error without changing any decision.

1. **The §6.2 price table** (lines 607-619). Superseded on its own terms; the "retained for its reasoning" note is the annotate-not-delete pattern that already failed once. Keep §6.3's prose.
2. **§8 Q9** (lines 877-878). A live recommendation for a dead price.
3. **The Energy/Rest duplicate** (line 505 vs line 740). One variable survives.
4. **Every inline code-state assertion** (lines 14, 22, 213, 214, 591, and Appendix A's already-executed rows). Replace with defect IDs. The failure table in §5 is the whole argument.
5. **The §5.6 reconciliation blockquote as a table resident** (lines 575-584). The decision it records is correct and belongs in the register; the blockquote broke the table.
6. **`docs/product-brief.md`**, per the PRD's own Q12: superseded, and its unfilled placeholders invite an agent to fill them. Root `CLAUDE.md` already marks it do-not-cite; retire the file.
7. **The three stale claims in `backend/CLAUDE.md`** (Sydney, 56 tests, `migrations/`). Ten minutes, and every backend session stops ingesting false facts.

Do not cut: the research citations, Appendix B, the anti-target and never-build tables, or the length itself. A 915-line spec maintained by one person and executed by one agent is within Google's 10-20 page norm for large projects ([Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)). The problem was never length; it is the seven items above.

---

## 8. Later, and the trigger for each

Real practices, deliberately not adopted now, each with the observable event that makes it worth adopting. Recording the trigger is what stops "later" from meaning "never" or "immediately".

| Practice | Why premature at team size one | Adopt when |
|---|---|---|
| **Requirement traceability matrix** (requirement, test, commit) | Maintaining the matrix costs more than the drift it catches when writer, implementer and tester are the same person plus one agent. Requirement IDs in test names give most of it free. | First hire, or the first external audit that requests it (`docs/obligations.md` owns whether one will). |
| **Formal RFC lifecycle** (comment periods, sign-off) | Rust's final-comment-period exists to build consensus among strangers ([Rust RFC README](https://github.com/rust-lang/rfcs/blob/master/README.md)). There are no strangers. | A second regular contributor whose disagreement needs a process to resolve. |
| **Full PR/FAQ per feature** | The complete internal/external FAQ is sized for organisational persuasion; the one-page press release alone captures the customer-forcing function. | The next genuinely new surface: Household, or hardware re-entry at the 1,000-subscriber gate. |
| **EARS across the entire spec** | Full notation on positioning prose adds ceremony without catching errors, and over-constraint has its own failure mode ([skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)). | Now for money math, notifications, schema and the pet contract (§3); everywhere else, when a requirement is handed to someone who cannot ask follow-ups. |
| **Automated doc lint** (duplicate numbers, file:line ban, dead cross-references) | Hand-running it takes two minutes at current doc count (§5.5). | The second contradiction found after this round is fixed, which is evidence the manual check is not being run. It has already happened once (push cap fixed, §6.2/Q9 left standing), so the fuse is short. |
| **Spec-code sync gate in CI** (merges touching goals/reactions/notifications must touch the PRD or defect list) | The PR-template checklist line is free and probably sufficient for one disciplined author. | The first silent resolution that occurs after the register and SPEC-GAP rules from §5 are in place. |
| **Formal standalone design docs** | Collapsed into build specs per §1.2. | The first decision expensive enough that two alternatives deserve written trade-off analysis longer than two sentences. Multi-currency (roadmap item 16) is the likely first instance. |
| **Event-schema registry for analytics** | There are zero events today; naming ~10 events in the instrumentation build spec is enough. | When `docs/engineering-budgets.md`'s pipeline exists and a second surface (Android) starts emitting the same events. |

---

*Sources relied on: [Claude Code best practices](https://code.claude.com/docs/en/best-practices), [Rust RFC README](https://github.com/rust-lang/rfcs/blob/master/README.md), [Rust RFC 2094](https://github.com/rust-lang/rfcs/blob/master/text/2094-nll.md), [PEP 1](https://peps.python.org/pep-0001/), [PEP 634](https://peps.python.org/pep-0634/), [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/), [EARS](https://alistairmavin.com/ears/), [Working Backwards PR/FAQ](https://workingbackwards.com/concepts/working-backwards-pr-faq-process/), [Painless Functional Specifications](https://www.joelonsoftware.com/2000/10/02/painless-functional-specifications-part-1-why-bother/), [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), [Shape Up ch. 3](https://basecamp.com/shapeup/1.2-chapter-03), [skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md). Code claims verified against the repo at commit `d8adad1` on 2026-08-12. Unverified: whether the Fly-deployed build matches this commit (runtime behaviour was not exercised), and whether the Android client consumes any of the touched response shapes.*
