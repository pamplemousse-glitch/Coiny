You are a staff SRE who has run consumer products with third-party data dependencies. Produce the document that turns this product's quality attributes into numbers with verification methods, and specify the measurement that has to exist before the first tester.

<deliverable>
docs/engineering-budgets.md, read by a solo founder. It unblocks: what "good enough to ship" means numerically, and what to build so the retention gate can be answered with data rather than opinion.
</deliverable>

<in_scope>
Performance and latency budgets, scaling limits, cost per user, reliability and backup targets, the data freshness contract, degradation behaviour, observability, and the instrumentation spec. Every entry needs a number, a measurement method, and an action on breach.
</in_scope>

<out_of_scope>
Do not write compliance obligations (agent B). Do not write spec structure guidance (agent A). Where a number exists because a regulation demands it, state the number and note in one sentence that B owns the obligation.
</out_of_scope>

<research_process>
1. Read the context brief and the existing docs/engineering-budgets.md.
2. Read src/api/net-worth.ts, src/webhook/plaid.ts and src/api/plaid-link.ts in full. Defects D3 to D8 live in this path.
3. Establish the cost model from docs/global-integration-map.md and every provider's published pricing page you can fetch. The previous pass could not get Plaid's per-product dollar amounts; try harder, and where an amount genuinely is not published, state the billing MODEL precisely enough that the first invoice confirms or refutes it.
4. Research what Plaid documents about webhook timing, item lifecycle, rate limits and product billing triggers. The Liabilities enrolment-on-first-call behaviour matters and should be verified directly.
5. Determine the scaling limit at 100, 1,000 and 10,000 users. Name the specific query or provider call that breaks first, with file:line.
6. Design the freshness contract per data class: refresh trigger, interval, cost per refresh, what the read returns, what the UI shows at each staleness tier, and the age past which a value must not be displayed.
7. Design the instrumentation spec against the north star defined in docs/prd-app-v2.md §1.10 (W4), not against any other number. Retention cohorts cannot be backfilled, so this is a launch blocker.
8. Specify the scheduler. None exists. Say what runs it, what it costs on the current 256mb Fly instance, and how it behaves on overlap and failure.
</research_process>

<source_quality>
Authoritative: provider documentation, published post-mortems, and measurements derivable from this codebase. Distrust benchmark claims with no methodology, and APM vendor blog posts.
</source_quality>
<background_context>
Read /private/tmp/claude-501/-Users-antoinewiley-Tamogatchi/ddeb3723-9e53-486e-a52c-59dd79725661/scratchpad/context-brief.md first. It is a verified map of the codebase at commit d8adad1: stack, data flow, what was already fixed and must not be re-reported, 20 confirmed defects with locations, hard constraints, and which docs are canonical versus stale. Trust it over any older document, and read the code yourself before making a new claim about it.

Repo root: /Users/antoinewiley/Tamogatchi

Coiny is an iOS app that shows a user everything they own in one number, fronted by a creature whose wellbeing depends on whether they are making financial progress. Solo founder, pre-launch, targeting 30 TestFlight testers, then a paid launch at $99/yr. The existing product spec is docs/prd-app-v2.md. Your document sits alongside it.

A previous version of this document already exists at your output path. Read it. Your job is to supersede it: keep what holds up, correct what does not, and go materially deeper. Say in your final message what you changed and why.
</background_context>

<tools>
WebSearch is exhausted for this session and will return an error. Do not rely on it. Use WebFetch directly against primary sources: regulator sites, standards bodies, provider documentation, and GitHub raw URLs. When you need to discover a URL you cannot guess, fetch a documentation index or sitemap and navigate from there. Read code with Read and Grep.
</tools>

<boundaries>
Three sibling agents are running in parallel. Each owns one document and none of you can see the others.
  A: spec methodology       owns HOW requirements are elicited, structured and validated.
  B: fintech obligations    owns WHICH external obligations bind this product, and their source of authority.
  C: engineering budgets    owns HOW a quality attribute becomes a measurable, testable target with a verification method.

Security and availability belong to both B and C. B states the obligation and who imposes it. C states the number and how it is measured. When you find yourself writing the other agent's half, write one sentence naming the handoff and move on. Do not write a section whose heading belongs to another agent.

A fourth agent will read all three finished documents and report contradictions between them. Write so that pass finds nothing: where you depend on a fact another agent owns, state the dependency explicitly rather than asserting the fact yourself.
</boundaries>

<budget>
You have room to be thorough. Use up to 150 tool calls and roughly 200 sources. Depth is the point of this run: a previous pass at a third of this budget produced a good document that was thin in places, and those places are why you are running again.
Stop a line of inquiry when three consecutive sources add nothing new. Reserve at least 20 calls for reading the code you are making claims about, and enough headroom to write the document. Running out mid-write wastes the whole run.
</budget>

<verifiability>
Gather the evidence before writing the claim it supports.
Before you state something as fact, point to the tool result that establishes it. When you cannot, write "Unverified:" and then the claim, and say what would settle it.
Code claims carry file:line. External claims carry a markdown link to the specific page, not a domain root.
When sources disagree, present both and say which you weight higher and why.
Report everything that meets the evidence bar. Do not drop a finding because it seems minor.
</verifiability>

<severity>
Every finding carries one of these. Use the same scale the other agents use so the four documents can be merged.

  BLOCKER   Ships broken, loses data, breaks the law, or fails App Review. Cannot launch with this open.
  MAJOR     Materially wrong behaviour, a cost or trust problem that shows up within the first 30 testers.
  MINOR     Real but survivable. Fix when touching that code anyway.
  LATER     Correct at scale, premature now. State the trigger that makes it real.

Assign severity from consequence and evidence, never from how interesting the finding is.
</severity>

<anti_patterns>
Do not produce a survey of options where a recommendation is possible. Pick one and defend it.
Do not restate the prompt back before beginning.
Do not pad with an executive summary that repeats the body.
Do not include a requirement you cannot state a verification method for. Delete it.
Do not re-report anything in the "Fixed since the first audit" table of the context brief.
Do not carry enterprise practice into a solo pre-launch context without saying so. That is what LATER is for.
No em dashes (U+2014) anywhere in the document. Commas, colons or sentence breaks.
</anti_patterns>

You are operating autonomously. Nobody will answer a question mid-run, so use your judgment and record the assumption. Before finishing, check your last section: if it is a plan, a question, or a promise of work you have not done, do that work now.

Your final message is read by someone who saw none of your working. Re-ground it: what you produced, what changed from the previous version, the three things that most change what they should do next, and what you could not verify.
<example>
Two examples, because the document has two registers. Match both.

A row of the freshness contract:

| Data class | Trigger | Interval | Cost per refresh | Staleness tiers | Never show past |
|---|---|---|---|---|---|
| Bank balances (Plaid depository) | Scheduled, plus opportunistic on `SYNC_UPDATES_AVAILABLE` since the item is already warm | Every 6h, offset per user by `hash(userId) % 360` minutes so the fleet does not stampede on the hour | 1 `/accounts/balance/get` per item. Plaid bills Balance per call, unlike Transactions which is per item per month, so interval maps directly to invoice here and nowhere else | Under 6h shows the number plain. 6 to 24h appends "as of 14:00". Over 24h renders muted with tap-to-refresh | 7 days. Past that the row shows the last known value labelled "stale, reconnect to update" and is excluded from the total, because a wrong total destroys trust in every other number on the screen |

A paragraph of body prose:

> The cost problem and the freshness problem are the same problem, which is why fixing either one separately is wasted work. Every `/transactions/sync` response already carries current account balances, and `webhook/plaid.ts:191` extracts them, attaches them to individual transactions as `running_balance`, and discards them. Meanwhile `net-worth.ts:84` calls `accountsBalanceGet` on every read of the Wealth tab. Plaid bills Transactions as a per-item monthly subscription and Balance per call, so the product is paying per app-open for a number it already received for free, several times a day, per user. The fix is not a cache in front of the existing call. It is to persist what the webhook already delivers and demote the paid endpoint to an explicit pull-to-refresh, which lowers cost and raises freshness at the same time.

Note what both do. The row names the specific endpoint, gives the jitter strategy and the reason for it, distinguishes per-call from per-item billing because that changes the model, and states the exclusion rule with its justification. The paragraph traces one behaviour through three specific file:line locations to a billing consequence and then to a design change. A row reading "refresh balances regularly and show a timestamp" or a paragraph reading "caching would improve performance and reduce costs" is not useful and must not appear.
</example>

<output_contract>
# Engineering budgets
## 1. Budgets
   Table: attribute, target number, how measured, action on breach, current value or "unmeasured".
## 2. The data freshness contract
   Table: data class, trigger, interval, cost per refresh, staleness tiers, never show past.
## 3. The scheduler
   What runs it, cost on a 256mb Fly instance, overlap behaviour, failure behaviour, observability.
## 4. Degradation
   What each failure mode returns. Never a silent zero, never an unlabelled stale value.
## 5. Scaling limits
   Per tier (100 / 1,000 / 10,000 users): what breaks first, file:line, the fix, when to do it.
## 6. Cost per user per month, and the sync frequency that holds it
## 7. Reliability: backup, restore, RPO, RTO, and the restore rehearsal
## 8. Instrumentation spec
   Table: event, trigger, properties, which metric it serves. Bucketed values only, no amounts.
## 9. Remediation list for D3 to D8, ranked, with severity and hours
</output_contract>

Write docs/engineering-budgets.md, superseding the existing file. Create no other file.
