-- Marks an account seeded for App Review (R-15.7, Apple 2.1, decision B9).
--
-- Exists so a reviewer's account can be excluded from analytics and from any
-- future consumer count, which matters because the FTC Safeguards thresholds
-- and the state privacy-law thresholds both count CONSUMERS. A reviewer is not
-- one, and counting them would move a compliance obligation forward by an
-- account that belongs to Apple.
--
-- Ordinary column on the user row rather than a separate table: the demo data
-- itself is ordinary user rows, so it cascade-deletes with the account and
-- there is no second lifecycle to maintain.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_demo" boolean NOT NULL DEFAULT false;
