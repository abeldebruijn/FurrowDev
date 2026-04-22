CREATE TABLE "idea" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"source_vision_id" uuid NOT NULL,
	"roadmap_item_id" uuid,
	"title" text NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_source_vision_id_unique" UNIQUE("source_vision_id")
);
--> statement-breakpoint
ALTER TABLE "idea" ADD CONSTRAINT "idea_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea" ADD CONSTRAINT "idea_source_vision_id_vision_id_fk" FOREIGN KEY ("source_vision_id") REFERENCES "public"."vision"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea" ADD CONSTRAINT "idea_roadmap_item_id_roadmap_item_id_fk" FOREIGN KEY ("roadmap_item_id") REFERENCES "public"."roadmap_item"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea" ADD CONSTRAINT "idea_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
