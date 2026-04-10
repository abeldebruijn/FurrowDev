CREATE TYPE "public"."concept_project_stage" AS ENUM('what', 'for_whom', 'how', 'setup');--> statement-breakpoint
ALTER TABLE "concept_project_chat_message" ADD COLUMN "stage" "concept_project_stage" DEFAULT 'what' NOT NULL;--> statement-breakpoint
ALTER TABLE "concept_project" ADD COLUMN "current_stage" "concept_project_stage" DEFAULT 'what' NOT NULL;--> statement-breakpoint
ALTER TABLE "concept_project" ADD COLUMN "what_summary" text;--> statement-breakpoint
ALTER TABLE "concept_project" ADD COLUMN "for_whom_summary" text;--> statement-breakpoint
ALTER TABLE "concept_project" ADD COLUMN "how_summary" text;--> statement-breakpoint
ALTER TABLE "concept_project" ADD COLUMN "understood_what_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "concept_project" ADD COLUMN "understood_for_whom_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "concept_project" ADD COLUMN "understood_how_at" timestamp with time zone;