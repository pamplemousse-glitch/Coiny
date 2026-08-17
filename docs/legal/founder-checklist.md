# Compliance Founder Checklist

Tasks only the founder can do. Nothing on this list is done; do not mark items
without doing them. Ordered by what blocks what: items 1 to 5 gate TestFlight
external testing, items 6 to 9 gate Plaid production / the first real bank
connection, the rest gate paid launch.

## Gates TestFlight external testing

1. **Verify the Apple Developer enrollment is an Organization (R-27.1,
   BLOCKER).** developer.apple.com > Account > Membership details for team
   `UKL98DS9D3`. It must read Organization: Athanor Works LLC, not Individual.
   If Individual: start the organization migration immediately (needs the
   LLC's D-U-N-S number; lead time is weeks). Apple 5.1.1(ix) bars
   financial-services apps from individual enrollments.
2. **Confirm the support address.** Create/verify `contact@athanorworks.com`
   receives mail. Both legal documents and the App Store listing use it.
3. **Attorney review of the two documents.** Send
   `docs/legal/privacy-policy.md` and `docs/legal/terms-of-service.md` with
   the inline "Attorney note" flags, plus lawyer questions Q3, Q5, Q7 from
   `docs/obligations.md` section 8. The policy blocks TestFlight; the ToS
   blocks first paying user but reviews cheaper as a pair.
4. **Host the reviewed policy at a public URL.** Concrete path: a static page
   at `https://athanorworks.com/coiny/privacy` (or a one-page GitHub Pages
   site from a public repo if the domain has no hosting yet). Then: paste the
   URL into App Store Connect > App Privacy > Privacy Policy URL, and give it
   to whoever wires the in-app Settings link (5.1.1 requires both). Same for
   the ToS URL when reviewed.
5. **Transcribe the nutrition labels.** Open App Store Connect > App Privacy
   and answer field by field from
   `docs/legal/app-store-privacy-labels.md`. Do not improvise; the answers
   must match the shipped `PrivacyInfo.xcprivacy`.

## Gates Plaid production / first real bank connection

6. **Verify MFA everywhere (R-21.2, Safeguards 314.4(c)(5)).** Five minutes:
   Fly.io, Neon, Plaid dashboard, Apple Developer, Google Cloud. Record the
   date in `service-providers.md`.
7. **Sign the Qualified Individual designation.** Confirm your legal name in
   `safeguards-qualified-individual.md`, print or PDF-sign, store with the
   LLC records. Unsigned is undesignated.
8. **Adopt the disposal schedule.** Decide open decision B7 (the proposed 90
   days post-disconnect in `data-disposal-schedule.md`), date the adoption
   line. If you change 90, change the privacy policy section 4 to match.
9. **Plaid production request.** Plaid dashboard > Launch Center, with the
   hosted privacy policy URL. Note the lifecycle-webhook gaps (D7/D8) are
   engineering blockers reviewed in the same pass; coordinate timing with
   that workstream.

## Gates App Store submission

10. **Decide B9.** Accept or amend the demo-account plan in
    `app-review-demo-account.md`; once accepted it becomes two build tasks
    and two founder tasks (Fly secret + review notes).
11. **Read the blocked-to-automation legal pages** listed as Unverified in
    `docs/obligations.md` section 4, in a browser: Spinwheel developer
    policy (before any production credit data), Kalshi developer agreement,
    Coinbase CDP terms (before the OAuth build). One sitting.

## Standing

12. **Consumer count watch.** At 4,000 consumers, start building the four
    Safeguards elements waived under 16 CFR 314.6 (risk assessment,
    pen-testing program, incident response plan, annual report). They are
    deliberately not written today; writing them now for a pre-launch solo
    product is the failure mode PRD section 26 warns against.
13. **Annual service-provider review** per `service-providers.md`.
