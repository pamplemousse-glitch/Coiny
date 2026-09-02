-- Encrypt spinwheel_connections.last_credit_score (audit 1.3.1, runbook G2.10).
--
-- It was a plaintext integer sitting beside columns that are all AES-256-GCM:
-- the Plaid access token, the merchant names, the recurring-payment labels. The
-- audit calls it the single most sensitive scalar in the database, and it was
-- the one field readable straight out of a dump.
--
-- integer -> text because the ciphertext envelope is a string. The USING clause
-- turns any existing score into its decimal digits, which is a PLAINTEXT value
-- in a column that now expects an envelope. That is deliberate and already
-- handled: `decryptString` returns a non-envelope value as it found it and
-- counts it, which is exactly the tolerance ALLOW_LEGACY_PLAINTEXT_READS was
-- added for when migration 0048 encrypted the first batch of columns. Those
-- rows re-encrypt on the next score write, and
-- `scripts/backfill-encrypt-pii.ts` sweeps any that linger.
--
-- No production database exists yet, so the only rows this can touch are
-- staging's synthetic ones.

ALTER TABLE "spinwheel_connections"
  ALTER COLUMN "last_credit_score" TYPE text
  USING "last_credit_score"::text;
