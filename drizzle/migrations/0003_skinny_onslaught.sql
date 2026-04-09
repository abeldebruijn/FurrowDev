ALTER TABLE "project" ADD COLUMN "roadmap_id" uuid;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_roadmap_id_roadmap_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmap"("id") ON DELETE set null ON UPDATE no action;
