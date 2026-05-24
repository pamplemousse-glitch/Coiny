CREATE INDEX IF NOT EXISTS "reaction_history_user_idx" ON "reaction_history" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaid_items_user_idx" ON "plaid_items" USING btree ("user_id");
