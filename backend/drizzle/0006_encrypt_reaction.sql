ALTER TABLE "reaction_history" DROP COLUMN "reaction";
--> statement-breakpoint
ALTER TABLE "reaction_history" ADD COLUMN "reaction" text NOT NULL DEFAULT '';
