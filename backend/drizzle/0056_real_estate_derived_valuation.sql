-- The columns DR-21's derived tier needs, and the record of which tier a
-- figure came from.
--
-- DR-21 settles the manual-versus-integration argument with a third option:
-- "purchase price plus index, VIN plus mileage, pasted wallet address" —
-- assets that need no credential and no maintenance, so neither "I hate manual
-- entry" nor "I do not trust integrations" applies. Real estate had no columns
-- for it, which is why the handoff records derived valuation as unbuilt.
--
-- purchase_price_usd is entered once and never goes stale, because it is a
-- historical fact rather than an estimate. RentCast also returns it as
-- `lastSalePrice` in a response we already pay for, so this can later be
-- populated without asking the user at all.
--
-- Idempotent, per the convention 0033 established.
ALTER TABLE "real_estate_assets" ADD COLUMN IF NOT EXISTS "purchase_price_usd" numeric;
--> statement-breakpoint
ALTER TABLE "real_estate_assets" ADD COLUMN IF NOT EXISTS "purchase_date" date;
--> statement-breakpoint
-- Which method produced last_value_usd. NULL for rows valued before this
-- existed, 'avm' for a RentCast estimate, 'derived' for purchase price tracked
-- by the FHFA index.
--
-- Stored rather than inferred because the two are not interchangeable and the
-- user is owed the difference: an AVM is an opinion about THIS house, while a
-- derived figure is what a typical US home bought at that price on that date
-- would be worth now. R-8.1's rule is that a number is never presented as
-- something it is not, and that requires knowing which it is.
ALTER TABLE "real_estate_assets" ADD COLUMN IF NOT EXISTS "valuation_source" text;
