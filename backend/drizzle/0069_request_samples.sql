-- Sampled server-side request latency (R-1 budgets, runbook G1.22, audit rows
-- 4.5.3 and 4.13.4).
--
-- `engineering-budgets.md` §1 states latency budgets as p95 and says they are
-- measured by "`fly logs` through a jq percentile script until the telemetry
-- table exists". No such script exists, and Fly keeps a short rolling buffer
-- with no query interface, so a weekly p95 could not be reconstructed after the
-- fact. Every latency number in that document was unverifiable.
--
-- NO USER COLUMN, and that is the whole design, not an omission:
--
--   1. A request duration is a fact about the SERVER. `analytics_events` is
--      consent-gated (store/analytics.ts), so putting timings there would let
--      one person's usage-sharing preference decide whether we can see our own
--      p95 -- the same incoherence store/ops.ts refuses for vendor outages.
--   2. Route plus timestamp per user IS a behavioural trail: which screens
--      someone opened and when. Storing that to answer "how fast is the API"
--      would collect a browsing history to measure a server.
--
-- The route is the PATTERN Fastify matched ('/api/plaid/items/:itemId'), never
-- the resolved URL, so no identifier reaches this table by construction.
CREATE TABLE IF NOT EXISTS "request_samples" (
  "id" bigserial PRIMARY KEY,
  "at" timestamp with time zone DEFAULT now() NOT NULL,
  "route" text NOT NULL,
  "method" text NOT NULL,
  "status" integer NOT NULL,
  "duration_ms" integer NOT NULL
);
--> statement-breakpoint

-- Every query is "percentiles for a route over a window", and the purge is
-- "everything before a date".
CREATE INDEX IF NOT EXISTS "request_samples_route_at_idx"
  ON "request_samples" ("route", "at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_samples_at_idx"
  ON "request_samples" ("at");
