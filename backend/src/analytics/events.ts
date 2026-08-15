// The analytics event catalog (docs/prd.md R-24.2, engineering-budgets §8).
// Event names are binding; properties are a strict whitelist per event.
//
// Privacy invariants (R-22.6, .claude/rules/security.md #2), enforced here by
// construction rather than by review:
//   1. No free-form strings. Every string property is either a closed enum or
//      a lowercase machine token (no spaces, no '@', max 40 chars), so merchant
//      names, emails, and Apple subs cannot fit through the schema.
//   2. No amounts. Monetary values only ever appear as bucketed enum bands.
//   3. Strict objects: unknown property keys are rejected, not stripped, so a
//      client bug that attaches extra payload surfaces as a rejection.
//
// Events are partitioned into client-reported (accepted by POST /api/telemetry)
// and server-emitted (facts the backend observes itself; the endpoint rejects
// them from clients so a device can never forge e.g. push_sent or rung_completed).

import { z } from 'zod';

/** Lowercase machine identifier: snake/kebab tokens like 'plaid',
 *  'exit_institution_select'. Deliberately cannot contain spaces, '@', or
 *  uppercase, which excludes merchant names and email addresses by shape. */
const token = z.string().regex(/^[a-z0-9][a-z0-9_.:-]{0,39}$/, 'must be a lowercase machine token');

/** Bucketed USD bands per engineering-budgets §8. The only way a monetary
 *  magnitude may ever appear in analytics. */
export const valueBand = z.enum(['0-1k', '1k-10k', '10k-100k', '100k-1m', '1m+']);

export type ValueBand = z.infer<typeof valueBand>;

/** Bucket a USD magnitude into the §8 band. The only sanctioned server-side
 *  path from an amount to an analytics property (mirrors the iOS
 *  TelemetryValue.usdBucket). */
export function usdValueBand(amountUsd: number): ValueBand {
  const magnitude = Math.abs(amountUsd);
  if (magnitude < 1_000) return '0-1k';
  if (magnitude < 10_000) return '1k-10k';
  if (magnitude < 100_000) return '10k-100k';
  if (magnitude < 1_000_000) return '100k-1m';
  return '1m+';
}

const rungIndex = z.number().int().min(0).max(10);

// --- Client-reported events (accepted by POST /api/telemetry) ---------------

export const CLIENT_EVENT_SCHEMAS = {
  // The W4 activity signal (prd.md R-2.1). days_since_signup is informational;
  // the retention query recomputes day offsets from server timestamps.
  app_open: z.strictObject({
    source: z.enum(['push', 'icon']),
    days_since_signup: z.number().int().min(0).max(3650),
  }),
  // SPEC CHOICE: §24 names only onboarding_declared for onboarding; the funnel
  // needs per-step completion, so this generic step event was added.
  onboarding_step_completed: z.strictObject({
    step: token,
    step_index: z.number().int().min(0).max(20),
  }),
  onboarding_declared: z.strictObject({
    classes: z.array(token).max(30),
    class_count: z.number().int().min(0).max(30),
    // Per-class declared magnitude, bucketed (never a raw amount).
    value_band_by_class: z.record(token, valueBand).optional(),
  }),
  link_opened: z.strictObject({
    provider: token,
    source: z.enum(['onboarding', 'prompt', 'settings']),
  }),
  link_result: z.strictObject({
    provider: token,
    status: z.enum(['success', 'abandoned', 'error']),
    // Plaid Link onExit/onEvent metadata, tokenized (e.g. 'exit', view names).
    exit_status: token.optional(),
    view_name: token.optional(),
  }),
  // The net worth reveal. Raw seconds are kept (not bucketed) because R-5.1
  // needs a median against a 90-second target; elapsed time is not PII.
  first_number_shown: z.strictObject({
    seconds_since_signup: z.number().int().min(0).max(86400),
    class_count: z.number().int().min(0).max(50),
  }),
  // SPEC CHOICE: the hatch moment (R-5.1's 3-minute target) has no §24 name;
  // pet_hatched was added with the same elapsed-seconds shape.
  pet_hatched: z.strictObject({
    seconds_since_signup: z.number().int().min(0).max(86400),
  }),
  // SPEC CHOICE: the subscription reveal (R-5.7 acquisition hook) has no §24
  // name; the count is banded because a subscription count is behavioral data.
  subscriptions_revealed: z.strictObject({
    subscription_count_band: z.enum(['0', '1-2', '3-5', '6-10', '11+']),
  }),
  // Decile crossings only (R-7.5): at most 10 per rung per user.
  rung_progress: z.strictObject({
    rung_index: rungIndex,
    decile: z.number().int().min(1).max(10),
  }),
  // origin=market must be zero always (R-2.3); recording it is what proves it.
  reaction_shown: z.strictObject({
    type: token,
    origin: z.enum(['behavior', 'market']),
  }),
  push_permission_changed: z.strictObject({
    granted: z.boolean(),
  }),
  // SPEC CHOICE: §24 has no name for the Wealth pull gesture; the server only
  // ever sees the pulls that fire the billed POST, so 'debounced' pulls (which
  // downgrade to the free GET inside the client's 60 s window) are knowable
  // only client-side. Whether a pull then hit the daily bank cap is the
  // server's own decision and rides the server-emitted net_worth_refreshed.
  wealth_refresh_pulled: z.strictObject({
    outcome: z.enum(['requested', 'debounced']),
  }),
  // SPEC CHOICE: the S-25 offline banner render (R-8.9) is by definition
  // unobservable server-side; the event queues offline and flushes when the
  // network returns.
  offline_banner_shown: z.strictObject({
    screen: z.enum(['home', 'wealth', 'activity', 'settings']),
  }),
  // SPEC CHOICE: the S-17 repair prompt render (R-8.7). The underlying item
  // state is server-known (item_state_changed); that the UI actually surfaced
  // the prompt to a pair of eyes is not. item_status mirrors the client's view
  // of the item's health enum, never the institution.
  repair_prompt_shown: z.strictObject({
    item_status: z.enum(['reauth_required', 'expiring', 'revoked', 'error', 'unknown']),
  }),
} as const;

// --- Server-emitted events (rejected from clients) ---------------------------

export const SERVER_EVENT_SCHEMAS = {
  // Cohort day 0 for everything (R-2.1). Emitted on user-row creation.
  signup_completed: z.strictObject({
    method: z.enum(['apple', 'google']),
  }),
  account_connected: z.strictObject({
    provider: token,
    asset_class: token.optional(),
    nth_connection: z.number().int().min(1).max(1000),
  }),
  rung_started: z.strictObject({ rung_index: rungIndex }),
  rung_completed: z.strictObject({ rung_index: rungIndex }),
  rung_skipped: z.strictObject({
    rung_index: rungIndex,
    skip_reason: token.optional(),
  }),
  // SPEC CHOICE: §24 has no guardrail event; the W4 counter-metric (R-2.2)
  // needs period outcomes, so this server event was added. Target/actual values
  // stay in goal_periods (domain data); the event carries outcome only.
  guardrail_period_outcome: z.strictObject({
    guardrail_key: token,
    outcome: z.enum(['passed', 'missed', 'not_applicable']),
    repair_used: z.boolean(),
  }),
  push_sent: z.strictObject({ type: token }),
  // SPEC CHOICE: the reaction funnel (R-7.24/R-7.25). reaction_shown (client)
  // reports what a pair of eyes saw; these two are the server's own record of
  // what the reaction contract decided. Every collected match either performs
  // or is suppressed with a reason, so the funnel finally sees the matches the
  // old first-match engine dropped silently. origin=market must be zero
  // forever (R-2.3), same rule as reaction_shown.
  reaction_performed: z.strictObject({
    type: token,
    origin: z.enum(['behavior', 'market']),
    suppressed_count: z.number().int().min(0).max(50),
  }),
  reaction_suppressed: z.strictObject({
    type: token,
    reason: z.enum(['precedence', 'weekly_cap', 'daily_budget', 'non_direct']),
  }),
  sync_completed: z.strictObject({
    provider: token,
    duration_ms: z.number().int().min(0).max(600000),
    trigger: z.enum(['webhook', 'scheduled', 'pull']),
  }),
  sync_failed: z.strictObject({
    provider: token,
    error_class: z.enum(['timeout', '429', '5xx', 'auth', 'parse']),
    duration_ms: z.number().int().min(0).max(600000),
    trigger: z.enum(['webhook', 'scheduled', 'pull']),
  }),
  scheduler_tick_completed: z.strictObject({
    duration_ms: z.number().int().min(0).max(600000),
    refreshed_count: z.number().int().min(0).max(100000).optional(),
  }),
  scheduler_tick_skipped: z.strictObject({ reason: token.optional() }),
  // Connection breakage/repair (R-8.5). state names are binding.
  item_state_changed: z.strictObject({
    state: z.enum(['healthy', 'reauth_required', 'expiring', 'revoked', 'repaired']),
    // Plaid's own error code, lowercased. A closed vocabulary from Plaid, never
    // message text, so it cannot carry an institution name or anything a user
    // typed. Knowing WHICH failure dominates is what makes the breakage rate
    // actionable rather than just alarming.
    error_code: token.optional(),
  }),
  // SPEC CHOICE: goal CRUD has no §24 names. The mutations happen on the
  // server's own endpoints (api/goals.ts), so these are server-emitted: a
  // client-reported copy would be redundant and forgeable. Amounts appear only
  // as the bucketed band; names and emoji never appear at all.
  goal_created: z.strictObject({
    kind: z.enum(['save', 'payoff', 'purchase']),
    target_band: valueBand,
    has_target_date: z.boolean(),
    contribution_rule: z.enum(['recurring', 'roundup', 'manual']),
  }),
  goal_edited: z.strictObject({
    kind: z.enum(['save', 'payoff', 'purchase']),
    // Which fields the patch touched, as a closed vocabulary of field NAMES.
    // Values never ride along, so a rename or amount change is countable
    // without carrying what it changed to.
    fields_changed: z
      .array(
        z.enum([
          'name',
          'emoji',
          'kind',
          'target_amount',
          'target_date',
          'funding_account',
          'counts_existing_balance',
          'contribution_rule',
          'recurring_annual',
        ]),
      )
      .min(1)
      .max(9),
  }),
  goal_archived: z.strictObject({
    kind: z.enum(['save', 'payoff', 'purchase']),
  }),
  // The user-driven refresh (POST /api/net-worth/refresh): whether the billed
  // bank pull ran or hit the daily cap is the server's own decision
  // (engineering-budgets §2), so the cap outcome is recorded here, not by the
  // device that was told "capped".
  net_worth_refreshed: z.strictObject({
    bank: z.enum(['refreshed', 'failed', 'not_connected', 'capped']),
  }),
  // Post-launch, fed by StoreKit server notifications (R-25.4); defined now so
  // the hardware gate query has a stable shape to land on.
  subscription_started: z.strictObject({ plan: z.enum(['individual', 'household']) }),
  subscription_churned: z.strictObject({ plan: z.enum(['individual', 'household']) }),
} as const;

export type ClientEventName = keyof typeof CLIENT_EVENT_SCHEMAS;
export type ServerEventName = keyof typeof SERVER_EVENT_SCHEMAS;

export function isClientEvent(name: string): name is ClientEventName {
  return Object.hasOwn(CLIENT_EVENT_SCHEMAS, name);
}

export function isServerEvent(name: string): name is ServerEventName {
  return Object.hasOwn(SERVER_EVENT_SCHEMAS, name);
}

export type ClientEventValidation =
  | { ok: true; properties: Record<string, unknown> }
  | { ok: false; reason: 'unknown_event' | 'server_only' | 'invalid_properties' };

/** Validate one client-reported event name + properties against the catalog.
 *  Returns the parsed (whitelisted) properties, never the raw input, so nothing
 *  outside the schema can reach storage. */
export function validateClientEvent(name: string, properties: unknown): ClientEventValidation {
  if (isServerEvent(name)) return { ok: false, reason: 'server_only' };
  if (!isClientEvent(name)) return { ok: false, reason: 'unknown_event' };

  const parsed = CLIENT_EVENT_SCHEMAS[name].safeParse(properties);
  if (!parsed.success) return { ok: false, reason: 'invalid_properties' };
  return { ok: true, properties: parsed.data as Record<string, unknown> };
}
