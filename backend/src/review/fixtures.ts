// Demo data for an App Review reviewer (R-15.7, Apple 2.1, decision B9).
//
// ---------------------------------------------------------------------------
// What this is for
// ---------------------------------------------------------------------------
//
// Apple 2.1 requires a reviewer to be able to exercise the full app. Coiny's
// only login is Sign in with Apple, so there is no credential to hand over, and
// the product is invisible without financial data that a reviewer will never
// supply by linking their real bank.
//
// So the reviewer signs in normally, with their own Apple ID, through the
// ordinary auth path. This module fills the empty account that creates. The
// normal auth path is used precisely because defect D1 was an unauthenticated
// session mint, and nothing here may reopen it.
//
// ---------------------------------------------------------------------------
// Why declared and manual assets rather than fake vendor connections
// ---------------------------------------------------------------------------
//
// Every row written here is an ORDINARY user row of a kind the product already
// supports. No fake Plaid item, no synthetic Coinbase connection, no vendor
// credential that does not exist. Two consequences, both load-bearing:
//
//   - it cascade-deletes with the account, so there is no second lifecycle
//   - nothing downstream has to know a demo account exists. The scheduler, the
//     net-worth assembly and the goal engine all see rows they already
//     understand, so the reviewer exercises the real product rather than a
//     special case built to look like it.
//
// The values are deliberately unremarkable. A reviewer should see a plausible
// household balance sheet, not a portfolio that invites questions about
// whether the numbers are real.

/** One declared class and its bucketed value.
 *
 *  `declared` confidence is the honest label: the user (here, the fixture)
 *  stated the number rather than a vendor pricing it, and the UI says so. It
 *  also means these rows never claim to be fresh vendor data, which keeps the
 *  never-a-silent-zero rule intact for the reviewer's screen. */
export const DEMO_DECLARED = [
  { assetClass: 'bank', bucketedValueUsd: '8400' },
  { assetClass: 'investments', bucketedValueUsd: '31250' },
  { assetClass: 'crypto', bucketedValueUsd: '2600' },
  { assetClass: 'realEstate', bucketedValueUsd: '285000' },
] as const;

/** Named possessions, which is what the Wealth screen looks empty without. */
export const DEMO_MANUAL = [
  { name: 'Family car', category: 'vehicle', selfReportedValueUsd: '14500' },
  { name: 'Wedding ring', category: 'jewellery', selfReportedValueUsd: '3200' },
] as const;

/** Debts, so the ladder has something to work against and the Plan screen is
 *  not a congratulatory blank. A reviewer who sees only assets never sees the
 *  half of the product that is about paying things down.
 *
 *  The card sits above the high-APR threshold and the car loan below it, so
 *  the ladder has a real decision to make rather than a uniform list. */
export const DEMO_DEBTS = [
  {
    debtId: 'demo-card',
    issuer: 'Demo Bank',
    nickname: 'Credit card',
    type: 'credit_card',
    balance: '2150',
    apr: '22.9',
  },
  { debtId: 'demo-auto', issuer: 'Demo Credit Union', nickname: 'Car loan', type: 'auto', balance: '9800', apr: '6.4' },
] as const;

/** Gross asset value the fixtures declare, for the test that pins it.
 *
 *  8400 + 31250 + 2600 + 285000 (declared) + 14500 + 3200 (manual).
 *  Debts total 11,950, so a reviewer sees a positive six-figure net worth with
 *  real liabilities working against it. */
export const DEMO_ASSETS_TOTAL = 344_950;
export const DEMO_DEBTS_TOTAL = 11_950;
