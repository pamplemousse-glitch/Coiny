-- Operational events: what broke, when, and how often.
--
-- The gap this closes is the one `docs/incident-response.md` states plainly:
-- nothing alerts, and discovery would realistically come from a user or a
-- security researcher. `asset_class_cache.consecutive_failures` exists but is a
-- COUNTER, so it can drive backoff and nothing else. A connection can sit at
-- fifty consecutive failures indefinitely and the only symptom is a number that
-- quietly stopped moving. A counter cannot be alerted on, charted, or asked
-- "when did this start". A history can.
--
-- Deliberately NOT a column on analytics_events, and deliberately without a
-- user_id. analytics_events is data about a person: user-scoped and
-- consent-gated, so trackServerEvent writes zero rows for a user who turned
-- usage sharing off. Gating outage visibility on an individual's analytics
-- preference would be incoherent, since one opt-out would blind us to an
-- outage affecting everyone. And because it cannot be consent-gated, it must
-- carry nothing personal, which is why there is no user column here at all.
--
-- Idempotent, per the convention 0033 established.
CREATE TABLE IF NOT EXISTS "ops_events" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "at" timestamp with time zone DEFAULT now() NOT NULL,
  "severity" text NOT NULL,
  "kind" text NOT NULL,
  "vendor" text,
  "error_class" text,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
-- The health rollup reads "everything since T", and the retention purge deletes
-- "everything before T". Both are range scans on `at`.
CREATE INDEX IF NOT EXISTS "ops_events_at_idx" ON "ops_events" ("at");
--> statement-breakpoint
-- Per-vendor grouping for /health/integrations.
CREATE INDEX IF NOT EXISTS "ops_events_vendor_at_idx" ON "ops_events" ("vendor","at");
