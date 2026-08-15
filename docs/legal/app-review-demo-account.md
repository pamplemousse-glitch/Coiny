# App Review Demo Account Plan (R-15.7, Apple 2.1, open decision B9)

Apple 2.1 requires that a reviewer can exercise the full app. Coiny's only
login is Sign in with Apple, so there is no username/password to hand over, and
the product's value is invisible without financial data, which a reviewer will
not provide by linking a real bank. This plan is a concrete proposal for open
decision B9; the founder accepts or amends it, then it becomes a build task.

## Constraints the mechanism must satisfy

1. Must not resurrect an unauthenticated session mint. That was defect D1; the
   debug session endpoint is now gated to non-production sandbox builds via
   `isDebugBuild()` (`backend/src/server.ts`), and production must never grow a
   way to obtain a session without Apple/Google verification.
2. Must work in the production app against the production backend, because the
   App Review build is the TestFlight/App Store binary.
3. Must not require a real bank. Plaid production credentials cannot be used
   by a reviewer, and Plaid sandbox is not wired into the production backend.
4. Must be invisible to real users except behind knowledge from the App Review
   notes.

## Proposed mechanism: authenticated demo seed, gated by a review code

The reviewer signs in normally with their own Apple ID (Sign in with Apple
works for any Apple account and creates a fresh, empty Coiny account; the D1
lesson stays intact because the normal auth path is used). The demo part is
seeding that empty account with data:

1. **Backend:** `POST /api/review/demo-seed` in the protected scope (session
   required). Body: `{ code: string }`, Zod-validated. The handler compares
   the code against a `REVIEW_DEMO_CODE` secret (Fly secret, rotated after
   each review cycle), rate-limited and log-on-failure. On success it writes a
   deterministic fixture set for the calling user only: declared/manual assets
   across several classes, a synthetic transaction history shaped to trigger
   subscription detection, a mid-ladder state, and a pet state that has
   something to show. All rows are ordinary user rows (they cascade-delete
   with the account); a `demo` marker in the user row excludes the account
   from analytics queries and from any future consumer count.
2. **iOS:** in onboarding, the reviewer taps "Not now" (S-5) at the bank-link
   screen, then opens Settings, where a row labeled "App Review" appears only
   after 5 taps on the version number (a discoverable-by-notes affordance that
   no real user hits by accident), prompting for the code and calling the
   endpoint.
3. **App Review notes** (entered in App Store Connect at submission):
   "Sign in with any Apple ID. At the bank screen tap 'Not now'. Open
   Settings, tap the version number five times, choose App Review, and enter
   code <REVIEW_DEMO_CODE value>. The app populates with demo data. No real
   financial account is needed."

## Why not the alternatives

- **Shared demo Apple ID:** Apple discourages credential sharing for Sign in
  with Apple accounts, review sign-ins from arbitrary geography trip Apple ID
  security, and a shared account is a standing credential to rotate. Rejected.
- **Plaid sandbox in production for a flagged user:** requires dual Plaid
  environments in one deployment, contradicting the `NODE_ENV`-only
  environment rule and adding a cross-environment code path to the most
  sensitive integration. Rejected.
- **A debug build for review:** App Review reviews the release binary;
  `isDebugBuild()` is correctly false there. Not possible.

## What must exist before submission (build tasks, owned by engineering)

1. The `POST /api/review/demo-seed` endpoint with fixture module and tests
   (fixture data must satisfy the never-a-silent-zero rule so the reviewer
   sees the honest-state UI, not an error screen).
2. The Settings entry point and code prompt (view work; onboarding/settings
   owner).
3. `REVIEW_DEMO_CODE` set as a Fly secret (founder, at submission time).
4. The App Review notes text above pasted into App Store Connect (founder).

Nothing in this file is built yet. This document is the plan, not the state.
