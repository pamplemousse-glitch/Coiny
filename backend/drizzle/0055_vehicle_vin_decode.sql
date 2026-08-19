-- NHTSA vPIC decode results, cached on the vehicle row.
--
-- Cached rather than fetched per read because a VIN decodes to the same answer
-- forever: the VIN identifies the vehicle, and vPIC is describing the vehicle,
-- not its condition or its price. One call at add time is the whole cost.
--
-- Every column is nullable on purpose. vPIC being unreachable must not stop a
-- user recording a car they own, so the decode is enrichment and never a gate,
-- and a null here means "not decoded yet" rather than "not a real vehicle".
--
-- Idempotent, per the convention 0033 established.
ALTER TABLE "vehicle_assets" ADD COLUMN IF NOT EXISTS "make" text;
--> statement-breakpoint
ALTER TABLE "vehicle_assets" ADD COLUMN IF NOT EXISTS "model" text;
--> statement-breakpoint
ALTER TABLE "vehicle_assets" ADD COLUMN IF NOT EXISTS "model_year" integer;
--> statement-breakpoint
ALTER TABLE "vehicle_assets" ADD COLUMN IF NOT EXISTS "trim" text;
--> statement-breakpoint
ALTER TABLE "vehicle_assets" ADD COLUMN IF NOT EXISTS "body_class" text;
--> statement-breakpoint
-- vPIC's comma-separated code list, verbatim. Kept so a valuation that never
-- runs can be explained after the fact ("code 6, incomplete VIN") instead of
-- looking like a vendor outage.
ALTER TABLE "vehicle_assets" ADD COLUMN IF NOT EXISTS "vin_decode_error_code" text;
--> statement-breakpoint
-- NULL = never decoded, TRUE = worth spending a MarketCheck call on,
-- FALSE = vPIC could not resolve a make and year, so the sync skips it and
-- the free 500/month quota is not spent proving a typo is still a typo.
ALTER TABLE "vehicle_assets" ADD COLUMN IF NOT EXISTS "vin_usable" boolean;
