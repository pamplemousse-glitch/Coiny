You are a principal product engineer who has taken consumer fintech apps through App Store and Play review. Write the complete product specification for Coiny: the single document a solo founder builds the entire product from, with nothing else open.

<deliverable>
/Users/antoinewiley/Tamogatchi/docs/prd.md, replacing docs/prd-app-v2.md as the source of truth.

It is read by two audiences with different needs, and it must serve both:
  1. The founder, deciding what to build next and what "done" means.
  2. An AI coding agent, implementing a section without inventing scope.

It unblocks: starting the build. When it is finished, no further spec work should be
needed before writing code.
</deliverable>

<inputs>
Read every one of these in full before writing anything. They are not background, they
are the material you are consolidating.

  docs/prd-app-v2.md           The current PRD, 914 lines. Product decisions here are
                               settled unless this prompt says otherwise. Preserve them.
  docs/spec-methodology.md     A critique of the current PRD: a 21-row gap analysis,
                               10 required edits, a testability rule with worked
                               before/after pairs, rules for writing for an AI agent,
                               and an anti-rot mechanism. Apply all of it.
  docs/obligations.md          Regulatory and contractual obligations, provider terms,
                               threat model. Fold the ones that change what gets built
                               into requirements; cite the file for legal detail.
  docs/engineering-budgets.md  Performance and cost budgets, the freshness contract,
                               scheduler spec, instrumentation spec. Same treatment.
  docs/vision.md               Strategy, positioning, locked decisions, hardware gate.
  docs/design-direction.md     Art direction, the character brief, the anti-slop system.
  docs/market-research-2026-08.md  Competitors and, in §1, the evidence that argues
                               against this product. Section 1 of your document must
                               engage with it, not ignore it.
  /private/tmp/claude-501/-Users-antoinewiley-Tamogatchi/ddeb3723-9e53-486e-a52c-59dd79725661/scratchpad/context-brief.md
                               Verified codebase map. It predates recent commits, so
                               verify anything you rely on against source.

Read the code before describing it. `backend/src/`, `ios/Coiny/`. Every claim about
current state carries file:line.
</inputs>

<the_product>
Coiny (Athanor Works LLC): an iOS app that shows a user everything they own in one
number, fronted by a creature whose wellbeing depends on whether they are making
financial progress. One required bank connection; everything else derived or declared.
An 8-rung foundation ladder drives the creature's permanent evolution. Solo founder,
pre-launch, 30 TestFlight testers, then a paid launch at $99/yr individual and $169/yr
household. Android exists as a scaffold and is a second consumer of the same API.
</the_product>

<settled_decisions>
Write these in. Do not re-open them.

1. W4, the north star: a user who completed a foundation-ladder rung or a habit-goal
   period within 4 weeks of signup AND had an `app_open` event in days 21 to 27
   inclusive, where day 0 is signup. Signal is the iOS `app_open` event. Counter-metric:
   percentage who completed a guardrail period in week 4 with no `app_open`, because this
   product deliberately reduces app opens and a pure open-rate metric would understate
   it. Every other reference to W4 cites this definition rather than restating it.
2. The pet reacts to what the user controls, never to the market. Enforced in
   `backend/src/reactions/external.ts`.
3. Steam and SnapTrade are removed. Kraken has its own key-entry sheet requesting Query
   Funds permission only.
4. Discogs commercial permission is pending. Until granted, vinyl is a manual asset and
   no Discogs price data is displayed.
5. Push: 2 per rolling 7 days, 1 per day, quiet hours 21:00 to 08:00 user-local, weekly
   digest opt-in. Quiet hours require an IANA timezone captured at device registration;
   unknown timezone suppresses the push.
6. Hardware is out of scope, gated at 1,000 paying subscribers active at 3 months.
7. Pricing: free / $99 individual / $169 household up to 5 members.
</settled_decisions>

<platform_requirements>
These are verified from primary sources this session. Treat as ground truth and build
requirements against them. Do not re-research; do cite them.

APPLE, App Store Review Guidelines:
  5.1.1(ix)  Apps in banking and financial services must be submitted by a LEGAL ENTITY,
             not an individual developer. The current account is a personal enrollment.
  5.1.1(v)   An app supporting account creation must offer account deletion in-app, and
             must explain data retention and how to revoke consent.
  5.1.1(i)   Privacy policy required, linked in App Store Connect AND accessible in-app,
             disclosing data collected, uses, third-party sharing, and retention.
  5.1.1(ii)  Consent required before collecting user or usage data. Purpose strings must
             clearly and completely describe the use.
  4.8        An app offering third-party login must also offer an equivalent option
             limiting data to name and email, with an option to keep email private.
  3.1.1      Unlocking features requires In-App Purchase. No license keys, no crypto.
  3.1.2(a)   Auto-renewing subscriptions must last at least 7 days AND be available
             across all of the user's devices.
  3.1.2(c)   Before subscribing, clearly disclose period, renewal, price, what is
             included, and how to cancel.
  1.6        Appropriate security measures for collected user information.

GOOGLE, Core App Quality (Android, since Android is a live second client):
  Touch targets minimum 48dp. Contrast 4.5:1 small text, 3:1 large text and graphics.
  Line length 45 to 75 characters. Light and dark theme support.
  App startup under 2 seconds or a progress indicator. 60fps, 16ms frame budget.
  State preserved across backgrounding, rotation, fold, and process death.
  Back button and back gesture both supported.
  No personal or sensitive data in system or app logs.
  All network traffic over SSL. No non-resettable hardware IDs.
  Runtime permissions requested at point of use with a rationale, degrading gracefully
  when denied. Biometric auth supported for financial or sensitive information.

APPLE accessibility numbers, for the iOS side: 44x44pt minimum touch target, WCAG AA
contrast (4.5:1 text, 3:1 graphics), Dynamic Type support across the full range,
VoiceOver labels on every meaningful element, respect Reduce Motion, and never rely on
colour alone to carry information. This last one is load-bearing for a product whose
core signal is a creature's visual state.
</platform_requirements>

<structure>
Write these sections, in this order. A section with nothing to say gets one line saying
so and why, never filler.

PART I, PRODUCT
  1  What this is, and the case against it
     Positioning, target user, three archetypes, anti-targets, core promise, the magic
     moment. Engage with market-research §1, which argues the pet mechanic decays by
     month three and nobody is asking for this. State how the design answers it.
  2  North star and counter-metrics
  3  Scope: in, out, and explicitly deferred with triggers

PART II, EXPERIENCE
  4  Information architecture and navigation
  5  Onboarding and activation, screen by screen, with the time-to-value target
  6  The core loop: daily, weekly, monthly, rare
  7  Feature specs: the goal system, debt, the creature, wealth
  8  Empty, loading, error, offline and stale states, per screen
     This is the highest-value missing section. Broken connections are the documented
     number one churn cause in this category and nothing currently specifies what the
     user sees when one breaks.
  9  Notifications
  10 Copy and voice, with actual strings for every user-facing moment
  11 Accessibility
  12 Localisation and multi-currency

PART III, SYSTEM
  13 Data model
  14 API contract and versioning, noting Android as a second consumer
  15 Auth, session and device lifecycle
  16 Data freshness, sync and the scheduler
  17 Third-party integrations, each with its contractual constraints
  18 Offline behaviour and caching

PART IV, QUALITY
  19 Performance budgets
  20 Reliability: backup, restore, RPO, RTO
  21 Security and threat model
  22 Privacy: collected, retained, deleted, exported
  23 Testing strategy
  24 Instrumentation

PART V, BUSINESS AND RELEASE
  25 Monetisation: tiers, StoreKit, trials, restore, refunds, grace periods
  26 Compliance obligations by launch stage
  27 Platform requirements: App Store and Play, as a checklist
  28 Release: environments, CI gates, rollout
  29 Support
  30 Roadmap and phasing

APPENDICES
  A  Decisions register. Append-only: date, decision, evidence, who decided. Seed it with
     the settled decisions above and every contested decision already recorded.
  B  Open decisions needing the founder, each with your recommendation.
  C  Requirement status index: every requirement marked Built, Partial, or Unbuilt, with
     file:line for Built and Partial.
</structure>

<how_to_write_it>
Depth follows risk, not section count. A comprehensive spec that is uniformly shallow is
worse than one that is deep where the product can die and thin elsewhere. For a solo
founder at 30 testers, §8, §11, §15, §21 and §24 carry real risk. §29 is an email
address. Write them at proportionate length and say why when a section is deliberately
short.

Every requirement is testable. If you cannot state how it would be verified, either make
it verifiable or cut it. spec-methodology.md contains the rule and worked examples;
follow them.

Every number appears exactly once, in one section, referenced elsewhere. Where a number
already exists as a named constant in code, cite the constant rather than restating the
value. Duplicated numbers drift, and this codebase has already had three different push
caps in three places.

Mark every requirement Built, Partial or Unbuilt. Several sections of the current PRD
describe code that now exists, and a future session cannot tell.

Fold compliance and engineering constraints in as requirements where they change what
gets built. Leave the reasoning in the source document and cite it.

Where the inputs are silent and a decision is needed, put it in Appendix B with your
recommendation. Do not invent product decisions.

Cut anything that was scaffolding for the writing process rather than instruction for
the building.
</how_to_write_it>

<severity>
Where you flag a gap or a defect, use this scale.
  BLOCKER  Ships broken, loses data, breaks the law, or fails review. Cannot launch open.
  MAJOR    Materially wrong behaviour, or a cost or trust problem inside 30 testers.
  MINOR    Real but survivable. Fix when touching that code anyway.
  LATER    Correct at scale, premature now. State the trigger.
Assign from consequence and evidence, never from how interesting the finding is.
</severity>

<verifiability>
Gather evidence before writing the claim it supports.
Code claims carry file:line, verified by reading the file, not by trusting the brief.
External claims carry a markdown link to the specific page.
When you cannot verify something, write "Unverified:" and say what would settle it.
</verifiability>

<budget>
Up to 200 tool calls. This is a large consolidation and the inputs total several thousand
lines; read them properly rather than sampling. Reserve at least 40 calls for verifying
code claims and enough headroom to write the document in full. Running out mid-write
wastes the entire run.
</budget>

<anti_patterns>
Do not produce a survey where a recommendation is possible.
Do not restate this prompt before beginning.
Do not pad with an executive summary that repeats the body.
Do not write a section whose only content is that the section exists.
Do not carry enterprise practice into a solo pre-launch context without saying so; that
is what LATER is for.
Do not re-decide settled product decisions.
No em dashes (U+2014) anywhere. Commas, colons or sentence breaks.
</anti_patterns>

You are operating autonomously. Nobody will answer a question mid-run, so use your
judgment and record the assumption in Appendix A or B. Before finishing, check your last
section: if it is a plan, a question, or a promise of work you have not done, do that
work now.

Write docs/prd.md. Create no other file. Do not modify code.

Your final message is read by someone who saw none of your working: what the document
now covers, what you cut and why, which sections you deliberately kept short, the open
decisions in Appendix B, and what you could not verify.
