# DRAFT PROMPT — for review before handing to an agent

---

You are a principal engineer who has shipped consumer iOS apps to the App Store,
including regulated ones. Your job is to find what Coiny is missing that its own
specification never thought to ask about.

<the_actual_question>
Coiny has a 900-line PRD with 30 sections, a compliance analysis, engineering
budgets, and a requirement status index. All of it was written by the founder
and one AI assistant, in about a week, without shipping anything.

**Its blind spots are their blind spots.** A document cannot audit itself.

There are two kinds of gap, and **the second matters more**:

**1. Absence.** Things shipped apps have that this repository has nothing of.

**2. Divergence.** Things this repository DOES have, built in a way that differs
from how the industry does it, in a way that will cost something later. This is
the harder and more valuable half, because absence is at least visible on a
checklist. Divergence looks finished.

An example of the first, found in thirty seconds of grounding:
`docs/obligations.md` cites Apple guideline 3.2.1(viii) for money-management
apps, but **nothing in the repository mentions 3.2.2(ix)**, which governs
personal loan disclosure and caps APR presentation. Coiny displays debt APRs and
payoff plans. It probably does not apply, because Coiny does not originate
loans. But nobody checked, and nobody knew to.

Examples of the second, which is what to hunt hardest for: we have database
migrations, but hand-written with a bespoke journal that has silently skipped
four migrations to date. We have CI, but is it missing stages every mobile
pipeline has? We have a release process, but does it resemble how iOS apps are
actually released, or did we invent one? We have tests, but is the taxonomy
standard? We have error handling everywhere and no crash reporting anywhere.

For every significant system in this repository, ask: **is this how it is
normally done, and if not, what does the normal way buy that we are not
getting?** Then say whether the difference is a defect, a deliberate trade, or
genuinely better.
</the_actual_question>

<what_coiny_is>
An iOS app showing a user everything they own as one number, fronted by a
creature whose state reflects their financial behaviour. Solo founder, one LLC,
pre-launch, zero users, no team, no ops person and no plan to have one.

Stack: Fastify + TypeScript + Drizzle on Fly.io, Neon Postgres, native
Swift/SwiftUI iOS via XcodeGen. Plaid for bank data plus roughly twenty other
integrations. StoreKit 2 subscriptions. Sign in with Apple.

**Android is in scope for this audit.** It is a real second client consuming the
same API, currently 16 Kotlin files and 1 test: four screens (Pet, Wealth,
Spending, SignIn) with Compose and Google Sign-In. That maps to the iOS app as it
was BEFORE last night's rework, so it lacks the journey, the onboarding rewrite,
the Wealth status vocabulary, debt, goals, and everything else built since.

The founder's estimate is that reaching parity is roughly a day of work, and for
the screens that is plausible, since the API already exists. Audit that estimate
honestly. Parity is more than porting views: Play Billing is not StoreKit, the
Data Safety form is not Apple's nutrition labels, and Google Play's Core App
Quality is its own review bar with its own rejection reasons. Say what a day
actually buys and what it does not.

**Current state, verified today:** staging is deployed and healthy. 1,412
backend tests, 489 iOS unit tests, 19 UI tests, all passing. Production does not
exist yet, deliberately: it is created when real Plaid and Apple credentials
arrive. Nothing has ever shipped to a user, including TestFlight.
</what_coiny_is>

<read_first>
Read these before searching. You are looking for what is ABSENT, and you cannot
know what is absent without knowing what is present.

  docs/prd.md                  The spec. 30 sections plus Appendix C, a
                               requirement-by-requirement status index.
  docs/obligations.md          Regulatory, contractual, provider terms.
  docs/engineering-budgets.md  Performance, cost, freshness budgets.
  docs/build-status.md         What actually exists as of today, honestly.
  docs/environments-research.md and environments-setup.md
  docs/legal/                  Privacy policy, ToS, nutrition labels, Safeguards.
  CLAUDE.md, backend/CLAUDE.md, ios/CLAUDE.md, .claude/rules/security.md

Then read the code properly, because the divergence half of this audit lives
there and not in the documentation: `backend/src/`, `ios/Coiny/`, `android/app/`,
`.github/workflows/`, `backend/drizzle/`, `fly.toml`, `fly.production.toml`,
`neon.ts`, `backend/Dockerfile`, `ios/project.yml`.
</read_first>

<already_known_missing>
Do not spend budget rediscovering these. They are known, tracked, and either
scheduled or deliberately deferred. Mention one only if you find that the
industry treats it as far more urgent than we do, or approaches it in a way we
have not considered.

- Character art (commissioned art does not exist; every screen ships a placeholder)
- App Review demo account
- Revoke-all-sessions on sign-out
- Data retention purge job; backup restore rehearsal (RPO/RTO untested)
- Manual VoiceOver pass has never been run
- Debt analytics events absent from the event catalog
- Household invite and two-party consent flow (blocked on legal review)
- Apple organization enrollment, D-U-N-S, Plaid production access, attorney review
- The iOS simulator build cannot reach staging (hardcoded to localhost)
- No human has ever clicked through the app against a real backend
</already_known_missing>

<where_to_look>
Prioritise primary and high-signal sources. A listicle titled "10 things every
app needs" is worth nothing here.

**Primary, authoritative**
- Apple: App Store Review Guidelines in full, App Review preparation, Human
  Interface Guidelines, TestFlight documentation, App Store Connect help,
  privacy manifest and required-reason API rules, StoreKit 2 docs
- Google Play: Core App Quality, Play Console policy, the Data Safety form,
  Play Billing, and the launch checklist. Android is in scope, and its review
  bar is not Apple's.
- Plaid: production launch checklist, Item lifecycle, webhook requirements
- FTC Safeguards Rule (16 CFR 314), CFPB guidance relevant to consumer finance
  apps that do not hold funds

**High-signal GitHub**
- Curated lists: `vsouza/awesome-ios` and its Testing, Analytics, Deployment,
  Security, Accessibility, Localization sections
- Repositories that are explicitly launch or release checklists for mobile apps
- **Open-source iOS AND Android apps that actually shipped**, ideally
  finance-adjacent or privacy-sensitive. This is the single richest source for
  the divergence half. Read their release process, CI, crash and analytics
  wiring, store metadata handling, fastlane setup, versioning and changelog
  discipline, migration approach, and how they structure tests.
  Two questions per repository: what is in theirs that is not in ours, and where
  do we do the same thing differently? Name every repository you read.

**Practitioner writing**
- Post-mortems and rejection stories from App Review, especially finance apps
- Indie and solo-founder launch retrospectives: what they wish they had done
- Writing on mobile observability, staged rollout, and crash triage for tiny teams

**Tooling budget: WebSearch is exhausted in this session.** Use WebFetch against
URLs you know or can derive, plus the context7 MCP (`resolve-library-id` then
`query-docs`). If a source is unreachable, say so rather than guessing its
contents.
</where_to_look>

<constraints_on_recommendations>
A recommendation that ignores these is noise, so weigh them before proposing
anything.

1. **Solo founder, no ops, no on-call.** Operational burden is a first-class
   cost. An architecture nobody will maintain is worse than a simpler one they
   will. Say what each recommendation costs in ongoing attention, not just money.
2. **First-party analytics is a deliberate decision, not an oversight.** PRD §24
   chose no vendor SDK; the privacy manifest, the nutrition labels and the
   privacy policy are all built on that. Any tool you recommend that collects
   data must be reconciled with those three documents, or explicitly rejected.
   Do not casually recommend Firebase.
3. **Financial data.** Plaid-sourced bank balances and transactions. FTC
   Safeguards applies. Anything that ships data to a third party needs that
   named.
4. **Pre-revenue and self-funded.** Give real monthly costs.
5. **Nothing has shipped.** Recommendations that assume existing users, existing
   reviews, or existing traffic do not apply yet. Say when they start to.
</constraints_on_recommendations>

<deliverable>
Write `docs/launch-gap-analysis.md`. Create no other file. Do not modify code.

Structure it as a decision document:

- **The ten things most likely to bite, ranked.** Absence and divergence mixed
  together, ranked by consequence rather than by category. Each with: what it is,
  what specifically goes wrong without it, the evidence it matters (a primary
  source or a real post-mortem), what it costs, and whether it blocks TestFlight,
  blocks launch, or is post-launch. If the honest answer is that only four things
  really matter, say four and say why the rest do not.

- **The divergence audit.** The centrepiece. Walk the significant systems and
  compare each against how it is normally done. At minimum: migrations, CI
  pipeline, release and versioning, test taxonomy and coverage, error handling
  and observability, secrets management, dependency management, API versioning,
  auth and session handling, state management on both clients, and the build
  configuration for both clients.

  For each, a verdict, and be willing to say "this is fine":
    - **Defect.** Diverges and will cost something concrete. Say what and when.
    - **Deliberate trade.** Diverges for a reason that holds. Say the reason and
      the condition under which it stops holding.
    - **Better.** Diverges and is genuinely an improvement. Say why, so nobody
      later "fixes" it back to the norm.

- **The compliance sweep.** Every Apple and Google rule that plausibly applies
  and appears nowhere in our documentation, with the rule number and a verdict on
  whether it actually applies. The 3.2.2(ix) example above is the template.
  Include Google Play's Data Safety form and Core App Quality, which our
  documentation treats far more lightly than Apple's equivalents.

- **What shipped apps have in their repos that we do not.** Concrete, from
  reading real repositories: fastlane lanes, screenshot automation, crash
  symbolication, release scripts, store metadata as code, whatever it turns out
  to be. Name the repositories.

- **Android specifically.** What the founder's one-day parity estimate does and
  does not cover, itemised. What is a port of an existing iOS surface, what is
  genuinely new (Play Billing, Data Safety, Core App Quality, Android-specific
  lifecycle and back handling), and what has no iOS equivalent to copy from.

- **What we have that most do not,** if anything. Useful for knowing where to
  stop spending effort.

- **What you would deliberately not do,** and the trigger that would change your
  mind. Enterprise practice imported wholesale into a solo pre-launch product is
  a real failure mode.

- **Open questions for the founder**, each with your recommendation.

Every external claim carries a markdown link to the specific page or repository.
Every claim about Coiny's current state carries a file path. Where you cannot
verify something, write "Unverified:" and say what would settle it.

No em dashes (U+2014). Do not pad. A gap analysis that is half survey is a
survey.
</deliverable>

<anti_patterns>
Do not produce a survey where a recommendation is possible.
Do not list tools without saying which one to use and why.
Do not recommend anything that contradicts the first-party analytics decision
without arguing explicitly for reversing it.
Do not rediscover the known-missing list above.
Do not assume the PRD is right. It is the artefact under audit.
</anti_patterns>

Budget: up to 250 tool calls. You are autonomous; nobody will answer questions
mid-run. Where you must choose, choose and say what you chose.

Your final message is read by someone who saw none of your working: the ranked
list, the single most surprising thing you found, what you could not verify, and
what you would do first.
