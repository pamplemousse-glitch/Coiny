# Spec methodology

**Status:** Written 2026-08-12 against `docs/prd-app-v2.md` (2026-08-11) and the codebase as of commit `1685e84`.
**Answers one question:** is `prd-app-v2.md` good enough to build from, and what has to change first.
**Sibling documents:** fintech obligations (which external rules bind this product, and who imposes them) and engineering budgets (how a quality attribute becomes a measured target) are owned by separate documents and are only name-checked here.

---

## 1. What this spec is for, and what it is not

### 1.1 The verdict on prd-app-v2.md

The decisions in `prd-app-v2.md` are unusually well evidenced. Its structure is not yet executable. Build from it after one afternoon of edits, not after a rewrite.

The distinction matters because the two failure modes are different. A wrong decision costs weeks of building the wrong thing. An inexecutable spec costs nothing visible: the AI agent fills each gap silently and plausibly, and you discover the inventions one at a time in production. That second failure has already happened once: the PRD states three different weekly push caps (3 in §5.6 line 569, "twice a week" in §2.3 line 154, unstated in code) and the implementation silently resolved it to 2 (`backend/src/store/notifications.ts:9`, `PUSH_MAX_PER_WINDOW = 2`). Nobody decided that. The spec's ambiguity decided it.

**The eight edits required before the 4-week block starts** (each is substantiated in §5):

1. Reconcile the push cap to one number, stated once (§2.3 vs §5.6 vs `store/notifications.ts:9`).
2. Add a `declared_assets` table to §3.7. Onboarding screen 2 writes declared values with `confidence: 'declared'` (line 150) and no table in the spec holds them.
3. Add a cold-start rule to every trailing-window computation in §3.2 and §3.4. A day-one user has zero history, and day one is the exact path §1.7 showcases.
4. Define gross income or restate rungs 5 and 6 on take-home. Both consume a quantity no Layer 0 field derives (lines 231-232).
5. Delete the superseded §6.2 price table, fix the free tier at one integer (§6.5 line 640 says "2 to 3 connections"), and delete §8 Q9, which §6.5 already answered.
6. Merge §5.2 "Energy" and §6A.1 "Rest" into one variable with one name and one driver (lines 506 and 728 describe the same slot differently).
7. Add a user-timezone requirement. Quiet hours are "user-local" (line 571) and no timezone field exists anywhere in `backend/src` (grep over `db/schema.ts` and `src/`: zero hits).
8. Timestamp or remove every inline code-state assertion. Several rotted within 24 hours of writing (§4.2 has the evidence).

### 1.2 What each document is for

Three kinds of document, three jobs. Blurring them is how a 903-line file ends up holding both a pricing argument and a pseudocode amortization formula.

| Document | Job | Binding? | Coiny instance |
|---|---|---|---|
| **Product spec** | What we are building and why. Decisions, principles, requirements. Outlives any implementation. | Yes. Disagreements are settled by it. | `prd-app-v2.md` |
| **Design doc** | How, when the how is expensive to reverse: trade-offs and alternatives considered. Google's design docs exist "to discuss trade-offs"; docs that are mere "implementation manuals" waste effort ([Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)). | Advisory | At team size one, collapse into the build spec except for hard-to-reverse choices: schema, money math, vendor selection. Say the alternative you rejected in two sentences, not two pages. |
| **Build spec (ticket)** | One agent-executable unit of work with its own verification. 1-3 pages, the size Google calls a "mini design doc". | Yes, for one session | One per §7 roadmap item, written when the item starts |

The threshold for writing anything at all: Spolsky's rule is that a spec pays for itself "on any non-trivial project (more than about 1 week of coding or more than 1 programmer)" ([Painless Functional Specifications](https://www.joelonsoftware.com/2000/10/02/painless-functional-specifications-part-1-why-bother/)). Rust applies the same instinct to process: RFCs are required only for "substantial" changes, and explicitly not for refactors, performance work, or anything invisible to users ([Rust RFC README](https://github.com/rust-lang/rfcs/blob/master/README.md)). Anthropic's own guidance draws the identical line for agents: "If you could describe the diff in one sentence, skip the plan" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). Adapted for Coiny: **a build spec for anything touching money math, the pet contract, schema, or notifications; a one-sentence prompt for everything else.**

### 1.3 What this document is not

It does not re-litigate any product decision in the PRD. It does not state security or compliance obligations (sibling document B owns which external rules bind the product and their source of authority). It does not set performance numbers or instrumentation budgets (sibling document C owns how a quality attribute becomes a measured, verified target). Where a gap below needs one of those, the row says so and stops.

---

## 2. The structure, with a rationale per section

### 2.1 The product spec (what prd-app-v2.md should converge to)

Keep it as one file. Do not split it into a doc tree: the repo already has 12 stale planning documents that the context brief marks "do not cite," and every additional file is another thing that rots. The PRD's current shape is close. The recommended structure, with what each section is for:

| Section | Job | Rationale |
|---|---|---|
| **Status header + decisions register** | Date, status, and a table of locked decisions: ID, decision, date, supersedes. | The PRD already locks decisions (§6.5, §6A) but scatters them. When a lock and an open question coexist (§6.5 vs Q9), an agent cannot tell which is live. PEP 1's acceptance bar is "a clear and complete description"; a register is the cheapest way to keep "complete" true over time ([PEP 1](https://peps.python.org/pep-0001/)). |
| **One-page argument** | Why this product, what it displaces. | The PRD's §0 does this well. It is the press-release function of Amazon's PR/FAQ: a "forcing function to ensure that the creator of the new product idea is focused on the customer" ([Working Backwards](https://workingbackwards.com/concepts/working-backwards-pr-faq-process/)). One page, no code claims. |
| **Positioning: promise, users, anti-targets, voice, principles** | The adjudication layer. When two requirements conflict, the principles decide. | PRD §1.9 principle 5, "Precision or silence," mechanically generates the cold-start rules §3 is missing. A principles section earns its place only if later sections actually cite it. |
| **Mechanics, as numbered requirements** | The normative core. Every requirement carries an ID (R-3.4.2), a testable statement (§3 below), and a verification method. | IDs are what let a test declare what it verifies, a build spec scope one session, and a review check coverage. The Rust RFC template splits guide-level from reference-level explanation for exactly this reason: prose that teaches and text that binds serve different readers and must not blur ([Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md)). In the PRD, §3.1's evidence commitments are guide-level and §3.4's field list is reference-level; both belong, labeled. |
| **Non-goals** | What was considered and deliberately excluded, with the reason. | "Sometimes more importantly" than goals, per Google's template. The PRD's §1.6 anti-targets and §6A.5 never-build table are already exemplary; keep the pattern. |
| **Open questions, each with an owner and a resolution trigger** | Questions only the founder can answer. | PRD §8's question + recommendation pattern is right. Add: when a question is answered, it moves to the decisions register. It does not linger as a stale question (Q9). |
| **Research caveats appendix** | Numbers in circulation that did not survive checking. | PRD Appendix B is the best section in the document. Keep it forever. |

### 2.2 The build spec (one per roadmap item)

Written when the work starts, executed by the agent in a fresh session, deleted or archived when merged. Anthropic's guidance states the contract exactly: "The most useful specs are self-contained: they name the files and interfaces involved, state what is out of scope, and end with an end-to-end verification step that proves the feature works" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). The template:

```
# Build: <roadmap item>
Goal (one paragraph)
Requirements implemented: R-x, R-y (copied in, not just referenced)
Data definitions, including value-when-history-is-insufficient
Files to touch (from PRD Appendix A or fresh exploration)
Out of scope (explicit, or the agent will drift into Appendix A's other rows)
Approach + the alternative rejected, two sentences
Verification: the tests to write, the command to run, and one
  end-to-end check ("app.inject POST /api/goals with X returns Y;
  the pace field is null because the account is 3 days old")
```

### 2.3 Elicitation: where requirements come from, in order of cost

1. **The agent interviews you.** For any feature bigger than a sentence, start with: "Interview me in detail using the AskUserQuestion tool... dig into the hard parts I might not have considered. Keep interviewing until we've covered everything, then write a complete spec" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). This is the cheapest structured elicitation available to a solo founder, and it produces the edge-case questions (cold start, null dates, missing timezones) that this audit found the PRD skipped.
2. **The press-release paragraph.** Before any new surface (Household, hardware re-entry), write the PR/FAQ's five-part press release, one page, before anything else: heading, customer, problem, solution, one hypothetical customer quote ([Working Backwards](https://workingbackwards.com/concepts/working-backwards-pr-faq-process/)). "The first draft should take only a few hours." If the customer quote is unwritable, the feature is not understood yet.
3. **The 30 testers.** Post-TestFlight, tester friction reports become the requirement source. Route them through the same interview step so they arrive as testable statements, not vibes.

### 2.4 Sequencing and where rigour stops paying at team size one

The PRD already sequences well: PEP 1's "single key proposal" principle ([PEP 1](https://peps.python.org/pep-0001/)) applied to execution means one build spec in flight at a time, in §7's stated order, with `net_worth_daily` first because four other requirements consume it (PRD line 333).

Where to stop: the drift found in this audit is the empirical answer. The PRD's code-state claims began rotting within 24 hours (§4.2). At team size one with an AI agent shipping daily, **document freshness beats document completeness**. Therefore:

- **Do now:** requirement IDs, verification methods, one source of truth per number, a decisions register, cold-start rules, build specs per roadmap item.
- **Do not do:** traceability matrices, review boards, formal RFC lifecycles with comment periods, spec sign-off ceremonies, estimation rituals. Each is real practice at organizations quoted above, and each assumes readers and writers who are different people. §7 states the trigger at which each becomes worth it.

### 2.5 Validation: how a spec is checked before building from it

Four checks, all cheap, all of which `prd-app-v2.md` would currently fail:

1. **The stranger test.** Could someone who did not write it build each requirement without asking a question? Run it by asking the agent, in plan mode, to list every question it would need answered before implementing a section. Its questions are the spec's holes.
2. **The duplicate-number grep.** Every number stated twice must match. The PRD fails on push caps (3, "twice," 2) and free-tier connections ("2" in §6.2, "2 to 3" in §6.5).
3. **The cold-start pass.** For every computed field, ask: what is this on day one, with zero history? The PRD fails on at least five fields (§5, rows for §1.7, §3.2, §3.4).
4. **Adversarial review after building.** "Use a subagent to review the diff against the spec. Check that every requirement is implemented... and nothing outside the task's scope changed. Report gaps, not style preferences" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). With the reviewer told to flag only correctness gaps, since a reviewer asked for findings will always produce some.

---

## 3. Making a requirement testable

**The rule:** a requirement is testable when a person or agent who did not write it can construct a check that fails today and passes when the requirement is met, using only the words in the requirement. In practice that means four things: every noun is defined, every number has a unit and a measurement window, every computation states its value when its inputs are absent, and the sentence names an observable response of a named system.

The sentence shape that enforces this is EARS, developed at Rolls-Royce for jet-engine control requirements and since adopted by Airbus, Bosch, Intel and NASA: "While <precondition>, when <trigger>, the <system> shall <response>", with an `If <failure>, then` form for unwanted behaviour ([EARS](https://alistairmavin.com/ears/)). Full EARS across a product spec is overkill here; use it wherever money math, notifications, or the pet contract are stated, because those are the places the agent must not improvise.

Five before/after pairs, each quoting an actual line of `prd-app-v2.md`:

**Pair 1, §1.10 line 116 (the north star):**
- *Before:* "the percentage of signups who complete a foundation-ladder rung or a habit-goal period within 4 weeks of signup, and are still active in week 4."
- *Why it fails:* "active" is undefined, and nothing that exists can compute any term of it: the codebase has zero analytics (context brief D9, confirmed by grep for posthog/amplitude/mixpanel/segment/sentry). The metric is currently unfalsifiable by construction.
- *After:* "W4 = signups whose `ladder_rung_completed` or `goal_period_passed` event fires within 28 days of `signup_completed`, AND who make at least one authenticated app-originated API request during days 22-28. Verification: computed weekly by a query over the events table; the instrumentation that emits these events is a launch-blocking dependency." (The event pipeline itself is sibling document C's half; the definition of "active" is this spec's half.)

**Pair 2, §2.3 line 144 (time to first value):**
- *Before:* "Time-to-first-value target: the net worth number on screen in under 90 seconds."
- *Why it fails:* no start point, no end point, no population, no measurement instrument.
- *After:* "When a new user completes sign-in, the app shall render the assembled net worth number within 90 seconds of `signup_completed`, measured as the median of `net_worth_rendered - signup_completed` across the first 30 TestFlight testers. Verification: the two timestamps exist as analytics events; the median is computed from them. If the median exceeds 90s, onboarding screens are cut until it does not."

**Pair 3, §3.2 line 207 (derived income):**
- *Before:* "`takeHomeMonthly`: Median of trailing 6 monthly sums of recurring inflow streams."
- *Why it fails:* undefined for anyone with under 6 months of transaction history, which includes every new user on the exact onboarding path §1.7 showcases. An agent will invent a fallback; whichever it invents will be wrong for someone.
- *After:* "While at least 2 complete calendar months of recurring inflow exist, `takeHomeMonthly` shall be the median of the trailing available monthly sums (up to 6). While fewer than 2 complete months exist, `takeHomeMonthly` shall be null, and every consumer of it shall render its declared-income fallback rather than a computed figure. Verification: unit test with 0, 1, 2 and 7 months of fixture history asserting null, null, median-of-2, median-of-6."

**Pair 4, §3.4 line 263 (run-rate math):**
- *Before:* "`requiredRunRate` = `(target_amount - current) / months_remaining`" where the field list at line 253 declares "`target_date (nullable)`."
- *Why it fails:* `months_remaining` does not exist for a dateless goal, and `pace`, `projectedDate` and `gapAction` all consume it. The spec authorizes a null it never handles: the classic divide-by-undefined an agent papers over with `?? 0`, which renders every dateless goal permanently "Off pace."
- *After:* "While `target_date` is null, `requiredRunRate` and `pace` shall be null and the goal shall render contribution history only, with no pace band. While `target_date` is set, `requiredRunRate` = `(target_amount - current) / months_remaining`, where `months_remaining` is the fractional month count from the computation date to `target_date`, floored at 0.25. Verification: unit tests for null date, past date, and a date 3 days out."

**Pair 5, §5.6 line 571 (quiet hours):**
- *Before:* "Quiet hours: 21:00 to 08:00 user-local, no exceptions."
- *Why it fails:* "user-local" names a datum the system does not possess. No timezone field exists in `backend/src/db/schema.ts` or anywhere in `backend/src` (grep: zero hits). As written, the requirement is unimplementable and the agent must either invent a timezone source or silently use server time, which is UTC on Fly.
- *After:* "The device registration payload shall include the device's IANA timezone identifier, stored per device token. If no timezone is stored for any of a user's devices, then the dispatcher shall suppress all pushes outside 21:00-08:00 UTC-8 through UTC+2 (the conservative union) rather than guess. When evaluating quiet hours, the dispatcher shall use the timezone of the most recently registered device. Verification: unit test of the dispatcher with a fixture token in Asia/Tokyo asserting suppression at 22:00 Tokyo time, delivery at 09:00."

The deletion corollary: **a requirement whose verification method cannot be stated is deleted or demoted to prose.** In the PRD, "Precision or silence" (§1.9) survives as a principle because principles adjudicate rather than bind. "Sliders are the difference between 20 seconds and abandonment" (line 150) is rationale, fine as prose. But "Energy: driven by app opens and user actions" (line 506) sits in a normative table with no formula and no test, and it is neither principle nor rationale. It must become a formula or leave the table.

---

## 4. Writing for an AI coding agent

The audience changes the failure modes, not the standards. A human implementer asks about gaps; an agent fills them fluently. Five rules, each grounded in something that already happened in this repo.

### 4.1 State desired behaviour, never current code state

The PRD asserts, as motivation, facts about the code: "`backend/src/store/transactions.ts:114` counts *any* credit over $50 as income" (line 213), "`dispatch.ts` currently fans out a push for **every** reaction" (line 579). Both were true on 2026-08-11. Both were false within 24 hours: commit `5c06775` ("fix(backend): correct income, debt double-count, market reactions, push spam") gated income on `INCOME_CATEGORIES` (`store/transactions.ts:119`) and put pushes behind an animation allowlist plus a budget (`reactions/dispatch.ts:10`, `store/notifications.ts:21-41`). An agent reading the PRD today would be instructed to fix two bugs that no longer exist, and nothing in the document can tell it so.

The fix is mechanical: code-state claims carry an "As of <date>" prefix or, better, a defect ID from a living defect list, and every build spec opens with "verify current state before acting on any claim in this section."

### 4.2 One source of truth per number

Agents grep. Every duplicated number is a coin flip over which copy gets implemented. Verified instances in this repo: the push cap exists as 3 (§5.6 line 569), "twice a week" (§2.3 line 154), and 2 in shipped code (`store/notifications.ts:9`); the free tier is "2" connections (§6.2 line 598) and "2 to 3" (§6.5 line 640); Plus is $59 (§6.2 line 597, §8 Q9 line 866) and $99 (§6.5 line 641). Rule: a number lives in exactly one section; every other mention is a section reference. The superseded copy is deleted, not annotated, because an agent can match a table row without reading the note above it.

### 4.3 Give every requirement an ID and every build spec a check

IDs (R-3.4.2) let a session be scoped to "implement R-3.4.1 through R-3.4.4, nothing else," let a test name what it verifies, and let the adversarial reviewer check coverage requirement by requirement instead of vibing over the diff. The check is the more important half: "Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). This repo is well set up for it: real-SQL tests via PGlite, `app.inject()` for HTTP, 865 passing backend tests. Every build spec ends with named test cases and one end-to-end assertion the agent runs before declaring done, and the agent is required to show the test output, not assert success.

### 4.4 Fix CLAUDE.md, because it is the spec the agent always reads

The project `CLAUDE.md` opens with "Read these docs first before any work" and lists `docs/handoff.md`, `docs/tech-stack.md`, `docs/proposed-changes.md`, `docs/implementation-plan.md`, `docs/launch-readiness.md`, `docs/14-day-sprint.md`, `docs/3-day-sprint.md`, `docs/architecture.md`, `docs/security.md`, `docs/sprint-plan.md` and `docs/mqtt-topics.md`. Per the verified context brief, every one of those is stale, most describe a BLE hardware product that was pivoted away from on 2026-08-11, and `docs/security.md` references an aggregator replaced long ago. **Every agent session on this repo currently begins by loading eleven documents that contradict the live product spec.** This is the single highest-leverage spec fix available, and it costs ten minutes: point the list at the four canonical docs (`vision.md`, `prd-app-v2.md`, `design-direction.md`, `global-integration-map.md`) plus `plaid-integration.md` and `.claude/rules/security.md`.

The pruning standard is Anthropic's: "For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). The existing "ask, don't assume" closing rule is exactly right for a solo project and should stay.

### 4.5 Session discipline around the spec

One build spec, one fresh session: "Once the spec is complete, start a fresh session to execute it. The new session has clean context focused entirely on implementation" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). Plan mode for anything multi-file. Adversarial subagent review of the diff against the build spec before merge, scoped to correctness gaps only. After two failed corrections on the same issue, clear and rewrite the prompt rather than correcting a third time; the guidance is explicit that a clean session with a better prompt beats an accumulated one.

---

## 5. Gap analysis of docs/prd-app-v2.md

Line numbers refer to `docs/prd-app-v2.md` as read on 2026-08-12. Code references were verified against source the same day. Verdicts: **sound** (build from it), **thin** (buildable but the agent will have to invent something), **missing** (a needed piece is absent), **unfalsifiable** (cannot be verified as written). Everything meeting the evidence bar is listed; severity ranking is a later pass.

| Section | Verdict | Evidence | Action |
|---|---|---|---|
| §0 The argument | Sound as argument, rotting as record | Asserts code state inline with no as-of mechanism: "evaluate() returns on the first match" (line 14) is still true (`backend/src/rules/engine.ts:11-18`), but the sibling claim that `transactions.ts:114` counts "any credit over $50 as income" (line 213, echoed at line 884) was fixed the day after writing: income is now gated on `INCOME_CATEGORIES` (`store/transactions.ts:119`, commit `5c06775`). | Prefix every code claim with its date or replace with a defect-list reference. Require build specs to re-verify before acting. |
| §1.1-1.6, 1.8-1.9 Positioning | Sound | Promise, archetypes, anti-targets, voice table, and five locked reaction lines (lines 94-103) are decision-grade and executable as copy. §1.9's five principles are stated crisply enough to adjudicate later conflicts. | None structural. Use principle 5 ("Precision or silence," line 112) as the generator for the cold-start rules missing in §3. |
| §1.7 Magic moment | Unfalsifiable on its own showcase path | Line 72 promises, 90 seconds post-signup: "At your current pace that is nine weeks." Pace requires contribution history; §3.4 line 264 defines `actualRunRate` over a trailing 90-day window, and the account was connected less than two minutes earlier. The flagship sentence is undefined at the only moment it is specified to appear. | Specify the zero-history variant ("You are $1,340 away," no pace clause) and the upgrade trigger (30 days of observed history on the funding account). |
| §1.10 North star | Unfalsifiable | W4 (line 116) hinges on "still active in week 4" with "active" undefined, and on events no system emits: zero analytics exist in backend or iOS (context brief D9, grep-confirmed). The 25% target at 1,000 users is uncomputable by anything in the §7 roadmap, which never schedules instrumentation. | Define "active" (proposed: >=1 authenticated app-originated API call in days 22-28) and add event instrumentation to the 4-week block. Event pipeline design belongs to the engineering-budgets document. |
| §2 Onboarding | Thin in two load-bearing places | (a) Screen 2 stores declared values "with `confidence: 'declared'`" (line 150), but §3.7's table list (lines 324-331) contains no table for declared assets, and Appendix A's schema row (line 883) adds only `debt_accounts`. The most important screen in the product writes to a table the spec never creates. (b) Screen 6 promises "at most twice a week" (line 154) versus §5.6's cap of 3 (line 569); shipped code says 2 (`store/notifications.ts:9`). | Add `declared_assets` (user_id, asset_class, bucketed_value, confidence, declared_at, refreshed_at) to §3.7. Pick one push cap, state it in §5.6 only, make §2.3 reference it. |
| §3.1 Design commitments | Sound | Each of the five commitments carries a citation and visibly constrains a later mechanic (commitment 2 → the three-goal cap at line 271; commitment 4 → recurring-default at line 272). This is the correct way to bind rationale to requirements. | None. |
| §3.2 Layer 0 | Thin: no cold-start column | Every field is a trailing-window computation and none states its value when history is short: `takeHomeMonthly` needs 6 months (line 207), `incomeVolatility` 12 (line 208), `essentialMonthly` 90 days (line 209). Rung 4's emergency-fund sizing (line 230) consumes `incomeVolatility`, so the rung 4 target is undefined for roughly a user's first year. Also `essentialMonthly` names categories ("rent, mortgage, utilities...") without pinning them to the transaction taxonomy actually stored in `transactions.category`. | Add a fourth column per field: minimum observation window, value while below it, and what the UI shows instead. Pin the category list to the actual stored taxonomy by exact string. |
| §3.3 Foundation ladder | Thin at rungs 2, 5, 6 | Rungs 5 and 6 are set as "15% of gross" and "25% gross savings rate" (lines 231-232), but gross income is derived nowhere: Layer 0 produces `takeHomeMonthly` only, and Plaid streams are net deposits. Rung 2's verification (line 228) is "Declared once, verified via 401k contribution stream if snaptrade/Plaid Investments connected," leaving the never-connected branch unstated: does declaration alone complete the rung? An agent would have to invent the answer to a question that gates pet evolution. | Either add a gross-income derivation (declared salary, or take-home grossed up by an estimated effective rate, shown with its assumption) or restate rungs 5-6 on take-home. State rung 2's rule for the unconnected case explicitly. |
| §3.4 Target goals | Unfalsifiable at the edges | `target_date` is nullable (line 253) yet `requiredRunRate = (target_amount - current) / months_remaining` (line 263) divides by a quantity that does not exist for dateless goals, and `pace`, `projectedDate`, `gapAction` (lines 265-267) all consume it. Separately, `actualRunRate` is a "trailing 90-day mean net contribution" (line 264) to an account that may be days old, so every young goal computes `pace` against near-zero history and renders "Off pace" (<0.5) from birth. | For null `target_date`: `requiredRunRate` and `pace` are null, goal renders contribution-only. Add a minimum-observation rule: pace is null with "too early to say" copy until 30 days of history exist on the funding account. |
| §3.5 Habit guardrails | Sound | The table carries period, default, data source, and an "Exists?" column (lines 284-292); streak mechanics are numeric and sourced (2 banked repairs, +1 per 3 completed periods, line 297). One dependency worth pinning: the savings-rate floor consumes the `savingsRate` definition that changed in commit `5c06775`. | Reference the corrected `savingsRate` definition by its Layer 0 row so guardrail and substrate cannot drift apart. |
| §3.6 Portfolio guardrails | Sound | Every threshold is a number with a rationale citation and a named data source (lines 307-316); the observation-versus-advice line is drawn and the pet exclusion is explicit (line 318). Whether the Advisers Act boundary is drawn correctly is the fintech-obligations document's half; the mechanics here are testable. | None structural. |
| §3.7 Schema | Thin | Six tables named, with fields given for `net_worth_daily` only (line 328). `debt_accounts` appears in Appendix A (line 883) but not here; `declared_assets` appears nowhere (see §2 row). As the sole schema section in the spec, it under-specifies the first thing the 4-week block builds. Note: `goals/` (categories.ts, derived.ts, ladder.ts) and the goal schema have since landed in code (commits `61061d4`, `4fab602`) with zero production callers (context brief D10), so the schema is now ahead of the spec. | Either expand each table to the precision of §3.4's `goals` block, or explicitly delegate field-level schema to build specs and mark this list non-exhaustive. Reconcile against the already-merged migration before writing more. |
| §3.8 Information architecture | Sound | Four tabs, one change each, one explicit removal (goals out of Settings, line 348). | None. |
| §4 Debt | Sound, two ambiguities | Dedupe match key and source precedence are stated (line 366); the payoff formula ships with its own validity guard, `requires P > r * B` (line 413), which is exactly the discipline §3 lacks. Ambiguity 1: Blend step 2 promotes any debt "cleared in <= 3 months at the current extra-payment amount" (lines 394-395) without saying whether the full extra payment is hypothetically concentrated on the candidate during the test. Ambiguity 2: §4.6's "projected utilization" (line 445) never defines the projection: last-synced balance, or spend extrapolated to close date? | State both: the promotion test assumes the full extra payment concentrates on the candidate; projected utilization = latest synced balance / limit with a maximum staleness bound on "latest." |
| §5.1-5.5 Reaction model | Sound, half-executed | The controllability field on every event type (lines 477-483) and the complete §5.4 taxonomy are enforceable as written. But the required deletions are half-done in code: crypto price events are gone (`reactions/external.ts:11`), while `net_worth_milestone` still returns celebrate/fanfare/rainbow (`external.ts:92-99`) and `credit_score_dropped` still returns sad/warning/red (`external.ts:110-117`), both of which §5.1 downgrades to non-reacting. §5.2's Vitality is "trailing 30-day guardrail pass rate, weighted by recency" (line 505) with no weights, and Energy (line 506) has no accrual formula or cap. | Track the remaining exogenous downgrades as defects with file:line, not prose. Specify Vitality's weights (proposed: last 4 weekly periods weighted 4:3:2:1) and Energy's accrual formula, or remove Energy's driver sentence from the normative table. |
| §5.6 Notifications | Thin: one input has no source | Numeric budget, correct server-side placement, and code already implements a version of it, with two divergences: cap 2 not 3 (`store/notifications.ts:9`) plus a 24h same-type cooldown the spec never asked for (`store/notifications.ts:13`). Quiet hours "21:00 to 08:00 user-local" (line 571) and the Sunday 18:00 digest (line 572) require a user timezone; no timezone field exists anywhere in `backend/src` (grep: zero hits), and the §3.7 `notification_log` table does not carry one. | Reconcile the cap to one number and decide whether the shipped cooldown is spec or accident. Add timezone capture (device-reported IANA zone at registration) as a requirement; quiet hours cannot ship without it. |
| §6 Monetization | Contradictory | Two price tables coexist: §6.2 at $59/$149 (lines 595-607) and §6.5 at $99/$169 (lines 639-642), with a prose note that §6.5 wins; an agent matching a table row will not read the note. §6.5's free tier is "2 to 3 connections" (line 640): a tier limit cannot be a range. §8 Q9 (lines 865-866) still recommends $59, same date as the $99 lock. | Delete the §6.2 table, keep its reasoning prose. Fix free at one integer. Delete Q9 as answered. |
| §6A Game mechanics | Sound, one duplication | §6A.1 (lines 724-728) restates §5.2's state model with the third variable renamed: Energy "driven by app opens and user actions" (line 506) becomes Rest "driven by whether anything needs doing" (line 728). Same slot, different name, different driver. An agent implementing §5 then §6A builds it twice. The §6A.5 never-build table is exemplary. | Merge into one table in §5.2 with one name and one driver; §6A references it. |
| §7 Roadmap | Sound | Sequenced with an end-to-end bar for the 4-week block ("link one account, see a net worth number, get placed on the ladder, complete rung 1," line 789), explicit exclusions (line 799), and a numeric hardware gate (line 823). Items map onto Appendix A files. Missing only instrumentation (see §1.10 row). | Convert each numbered item into a build spec at execution time per §2.2 of this document. Add an instrumentation item to the 4-week block. |
| §8 Open questions | Sound, one stale | Question + recommendation + rationale is the right pattern, and Q6's "I would override a founder objection" candor is worth keeping. Q9 is answered by §6.5 and now actively misleads. | Delete Q9; move answered questions into a decisions register rather than leaving them as questions. |
| Appendix A | Sound, no status mechanism | The file-by-file change table is precisely what an agent needs, and it is already partially executed: the `transactions.ts` row, part of the `external.ts` row, and part of the `dispatch.ts` row landed in `5c06775` the day after writing. Nothing in the table can record completion, so it will instruct redundant work forever. | Add a status column updated at merge time, or move rows into tracked issues and leave a pointer. |
| Appendix B | Sound | Three contested numbers, each with the trace of why it failed checking and where not to use it. The best hygiene practice in the document. | None. Extend it whenever a new number fails checking. |

---

## 6. What to cut

Cutting is a spec-quality action, not a product decision. Each item below removes a source of agent error without changing any decision.

1. **The §6.2 price table** (lines 595-607). Superseded by §6.5 on its own terms. Keep the §6.3 reasoning prose; delete the table so only one grep-able price exists.
2. **§8 Q9** (lines 865-866). Answered by the §6.5 lock dated the same day. A live recommendation for a dead price.
3. **The Energy/Rest duplicate** (line 506 vs line 728). One variable, one table, one name.
4. **Inline code-state assertions as normative text** (lines 14, 213, 579, 884-886 and others). Replace with dated defect references. The 24-hour rot documented in §4.1 is the whole argument.
5. **`docs/product-brief.md`**, per the PRD's own Q12 recommendation: its sections are answered by the PRD and its placeholders invite an agent to fill them. Endorsed; retire it.
6. **The stale doc list in `CLAUDE.md`** (§4.4). Eleven stale documents loaded into every agent session. This is the cheapest, highest-leverage cut in the repo.
7. **Requirements with no stateable verification**, per the §3 corollary: currently only Energy's driver sentence qualifies; everything else in the PRD's normative tables can be given a check.

Do not cut: the research citations, Appendix B, the anti-target and never-build tables, or the length per se. A 900-line spec that one person maintains and one agent executes is fine; Google's norm for large projects is 10-20 pages ([Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)) and this is that size. The problem was never length; it is the seven items above.

---

## 7. Later, and the trigger for each

Real practices, deliberately not adopted now, each with the observable event that makes it worth adopting. Recording the trigger is what stops "later" from meaning "never" or "immediately."

| Practice | Why premature at team size one | Adopt when |
|---|---|---|
| **Requirement traceability matrix** (requirement ↔ test ↔ commit) | Maintaining the matrix costs more than the drift it catches when writer, implementer and tester are the same person plus one agent. Requirement IDs in test names give 80% of it free. | First hire, or first external audit that asks for it (the fintech-obligations document owns whether one will). |
| **Formal RFC lifecycle** (comment periods, sign-off) | Rust's FCP exists to build consensus among strangers ([Rust RFC README](https://github.com/rust-lang/rfcs/blob/master/README.md)). There are no strangers. | A second regular contributor whose disagreement needs a process to resolve. |
| **Full PR/FAQ per feature** | The complete internal/external FAQ is sized for organizational persuasion. The one-page press release alone captures the customer-forcing function. | The next genuinely new surface: Household, or hardware re-entry at the 1,000-subscriber gate. Write the press release for those. |
| **EARS across the entire spec** | Full EARS notation on positioning prose adds ceremony without catching errors. | Now for money math, notifications and the pet contract (§3); everywhere else, when a requirement is handed to someone who cannot ask follow-ups, including the obligations and budgets the sibling documents produce. |
| **Spec changelog discipline** | A decisions register (§2.1) covers the solo case. | The first time a locked decision is reversed, so the reversal has somewhere to live other than memory. |
| **Automated spec-consistency lint** (duplicate numbers must match, section references resolve) | Hand-running the duplicate-number grep (§2.5) takes two minutes at current doc count. | The second contradiction found after this round is fixed, which is evidence the manual check is not being run. |
| **Formal design docs as standalone artifacts** | Collapsed into build specs per §1.2. | The first decision expensive enough to reverse that two alternatives deserve written trade-off analysis longer than two sentences. Multi-currency (roadmap item 16) is the likely first instance. |

---

*Sources relied on: [Claude Code best practices](https://code.claude.com/docs/en/best-practices), [Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md), [Rust RFC README](https://github.com/rust-lang/rfcs/blob/master/README.md), [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/), [PEP 1](https://peps.python.org/pep-0001/), [EARS](https://alistairmavin.com/ears/), [Working Backwards PR/FAQ](https://workingbackwards.com/concepts/working-backwards-pr-faq-process/), [Painless Functional Specifications](https://www.joelonsoftware.com/2000/10/02/painless-functional-specifications-part-1-why-bother/). Code claims verified against the repo at commit `1685e84` on 2026-08-12. Unverified: whether the Fly-deployed build matches this commit; runtime behaviour was not exercised.*
