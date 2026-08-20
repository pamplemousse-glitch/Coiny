-- The picture of the thing you own.
--
-- Every collectible vendor returns an image in the SAME response we already
-- spend a request on, and all five clients parsed a name and a price and threw
-- the picture away. A sneaker and a trading card are visual objects; a row of
-- text is a worse representation of them than the vendor already handed us.
--
-- Stored rather than fetched per read because the image belongs to the
-- PRODUCT, not to the holding: a given SKU or card has the same picture for
-- everyone forever, so it is written once on sync and never refetched.
--
-- The column holds a URL, not bytes. Bytes would put vendor CDN images through
-- our own storage and bandwidth for no gain in a list view. The privacy
-- consequence is real and belongs to the client: loading a remote image tells
-- the vendor's CDN the user's IP and roughly what they own. Whether the app
-- proxies these or loads them directly is a client decision (contrast Plaid,
-- which hands us institution logos as base64 precisely to avoid that), and is
-- deliberately NOT settled by this migration.
--
-- coin_holdings gets the column with nothing writing to it yet: PCGS's
-- documentation was unreachable (429 then 403) when this landed, and a field
-- name nobody has verified is not worth guessing at. The plumbing is here so
-- that filling it in later is one line in the client.
--
-- Idempotent, per the convention 0033 established.
ALTER TABLE "sneaker_holdings" ADD COLUMN IF NOT EXISTS "image_url" text;
--> statement-breakpoint
ALTER TABLE "trading_card_holdings" ADD COLUMN IF NOT EXISTS "image_url" text;
--> statement-breakpoint
ALTER TABLE "pokemon_card_holdings" ADD COLUMN IF NOT EXISTS "image_url" text;
--> statement-breakpoint
ALTER TABLE "coin_holdings" ADD COLUMN IF NOT EXISTS "image_url" text;
