ALTER TABLE "idea" ADD COLUMN "spec_sheet" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "idea" ADD COLUMN "user_stories" jsonb DEFAULT '[]'::jsonb NOT NULL;
