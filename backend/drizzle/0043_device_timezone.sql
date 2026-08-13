-- Quiet hours (docs/prd.md R-9.3) need the user's IANA timezone, captured at
-- device registration. Nullable: tokens registered by older app builds have no
-- timezone, and the dispatcher suppresses pushes for those users rather than
-- guessing a zone. Written idempotently to match the convention established
-- by 0033.
ALTER TABLE "device_tokens" ADD COLUMN IF NOT EXISTS "timezone" text;
