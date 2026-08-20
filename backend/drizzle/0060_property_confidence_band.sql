-- RentCast's own confidence interval, and the last recorded sale.
--
-- Both arrive in the response we already spend a call on, and both were
-- discarded. A $250,000 AVM estimate ships with a $195,000-$304,000 band:
-- roughly plus or minus 22% on the largest asset most Americans own, and we
-- stored the midpoint as though it were a measurement.
--
-- Same family as #279 (unpriced persisted as $0) and #284 (thin liquidity):
-- the vendor states its own uncertainty and we replace it with our own
-- confidence.
--
-- last_sale_price_usd is the input DR-21's derived valuation needs, which the
-- handoff records as blocked for want of a column. It is here for free, so a
-- property that later loses AVM coverage can still be valued from purchase
-- price and the FHFA index (0056) without asking the user for anything.
--
-- Idempotent, per the convention 0033 established.
ALTER TABLE "real_estate_assets" ADD COLUMN IF NOT EXISTS "price_range_low_usd" numeric;
--> statement-breakpoint
ALTER TABLE "real_estate_assets" ADD COLUMN IF NOT EXISTS "price_range_high_usd" numeric;
--> statement-breakpoint
ALTER TABLE "real_estate_assets" ADD COLUMN IF NOT EXISTS "last_sale_price_usd" numeric;
--> statement-breakpoint
ALTER TABLE "real_estate_assets" ADD COLUMN IF NOT EXISTS "last_sale_date" date;
