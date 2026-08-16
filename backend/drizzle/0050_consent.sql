-- Consent and legal acknowledgement, on `users` (runbook G1.6).
--
-- `legal_accepted_at` / `legal_version` are the Reg P 1016.9(b)(1)(iii) record:
-- the privacy notice is delivered by requiring the consumer to acknowledge it
-- as a necessary step to obtaining the service, and the sign-in screen is that
-- step. Nullable because every user created before this migration acknowledged
-- nothing; null means "no record", never "refused".
--
-- `analytics_opt_out` is the server half of the "Share usage data" toggle
-- (docs/legal/consent-copy.md section 2). Defaults to false because consent is
-- given at sign-in; turning the toggle off sets it true and every analytics
-- write for that user stops, client-queued and server-emitted alike.
--
-- Idempotent, per the convention 0033 established.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "legal_accepted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "legal_version" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "analytics_opt_out" boolean DEFAULT false NOT NULL;
