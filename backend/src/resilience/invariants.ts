// Plausibility checks on a value we just fetched, run against the value we had.
//
// Survey part B. The whole finding of that half is that our two real drift
// incidents violated the VOLUME and DISTRIBUTION pillars and never touched the
// SCHEMA pillar:
//
//   #302, Polkadot moved balances to Asset Hub. The relay chain kept answering
//     200 OK with dust, so every DOT holder read as near-empty. Same shape,
//     same types, plausible numbers, wrong magnitude.
//   #295, Zerion's positions endpoint needed pagination nothing had noticed, so
//     a large wallet would have been silently truncated. Every returned row was
//     valid; the missing rows were simply absent.
//
// A Zod schema catches neither. It is the right tool for the one pillar that
// did not break. What catches these is asking "is this plausible" rather than
// "did this parse".
//
// ---------------------------------------------------------------------------
// Why user data rather than canary accounts, for now
// ---------------------------------------------------------------------------
//
// The survey ranks canary accounts, a known address checked on a schedule,
// first among the cheap techniques. They are still the right thing LATER, and
// here is the honest reason to defer them: a canary earns its place by
// detecting drift BEFORE a user is affected. At one user, the user IS the
// canary, and the same detection costs zero extra vendor calls and zero metered
// quota. Canary accounts become worth their quota when there are users to
// protect from a bug rather than a single user who is already the tripwire.
//
// ---------------------------------------------------------------------------
// The rule that matters most
// ---------------------------------------------------------------------------
//
// A VIOLATION MUST NEVER BLOCK THE WRITE.
//
// A user who genuinely sold everything must still see the truth. A 99% drop is
// indistinguishable, from inside one account, from the Polkadot bug: the shape
// is identical and only breadth across many accounts tells them apart, which we
// cannot observe at this scale. So this raises an alert to US and never an
// error to THEM. Confusing those turns a monitoring feature into an outage, and
// would be a strictly worse failure than the one it is trying to catch.
//
// Not implemented here, because it already exists elsewhere: truncation
// detection. `zerion/client.ts` returns `truncated` from `getPositionsPage` and
// the caller falls back to the vendor's own unfiltered total. That is the
// volume-pillar check for the one endpoint that needed it, and duplicating it
// here would be a second copy of a rule that is already right.

/** What kind of implausibility was seen. Closed set: the health rollup groups
 *  on it, and a free-form string becomes unqueryable within a month. */
export type InvariantViolation =
  /** A value fell by more than the collapse threshold in one refresh. The
   *  Polkadot signature. */
  | 'value_collapsed'
  /** A non-zero value became EXACTLY zero. The signature of #289, where all
   *  thirteen chain clients returned 0 on every failure path and an expired key
   *  silently wrote a user's whole position to zero. `null` means unknown and
   *  `0` means empty; an exact zero arriving where money was is the case worth
   *  looking at. */
  | 'zero_from_non_zero'
  /** A value we could previously price became unpriceable. Not wrong, but it
   *  means a class silently left the total, which is the "smaller number"
   *  failure the whole programme is about. */
  | 'null_from_value';

export type InvariantCheck = {
  violation: InvariantViolation;
  /** Rounded to whole percent: this goes in an ops event, and a full-precision
   *  ratio of two balances is closer to a balance than it needs to be. */
  dropPercent: number | null;
};

/**
 * Compare a freshly fetched class value against the last stored one.
 *
 * Returns null when the transition is unremarkable, which is the overwhelming
 * majority of calls. Order matters: the checks run most-specific first, so an
 * exact zero is reported as `zero_from_non_zero` rather than as a 100%
 * collapse, because the two have different causes and different fixes.
 *
 * @param collapseRatio fraction of value lost that counts as a collapse, e.g.
 *   0.9 for "lost 90% or more". Deliberately far above normal market movement:
 *   a threshold that fires on a bad day in the market is a threshold that gets
 *   muted, and a muted alert is worse than none because it reads as coverage.
 */
export function checkValueTransition(
  previous: number | null,
  next: number | null,
  collapseRatio: number,
): InvariantCheck | null {
  // Nothing to compare against: a first fetch is a profile, not an alarm. The
  // drift-monitoring literature is unanimous on this, and a canary that alerts
  // on day one is a canary that gets muted by week two.
  if (previous === null) return null;

  // Only a previously POSITIVE value can collapse. A zero or a debt going to
  // null or to zero is not evidence of anything.
  if (previous <= 0) return null;

  if (next === null) return { violation: 'null_from_value', dropPercent: null };

  if (next === 0) return { violation: 'zero_from_non_zero', dropPercent: 100 };

  const lost = (previous - next) / previous;
  if (lost >= collapseRatio) {
    return { violation: 'value_collapsed', dropPercent: Math.round(lost * 100) };
  }

  return null;
}
