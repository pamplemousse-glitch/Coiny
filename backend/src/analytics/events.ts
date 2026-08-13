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
