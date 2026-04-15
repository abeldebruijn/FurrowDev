CREATE TABLE "project_widget_layout" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"large_layout" jsonb NOT NULL,
	"medium_layout" jsonb,
	"medium_auto_layout" boolean DEFAULT true NOT NULL,
	"small_layout" jsonb,
	"small_auto_layout" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "widget_layout_id" uuid;
--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_widget_layout_id_project_widget_layout_id_fk" FOREIGN KEY ("widget_layout_id") REFERENCES "public"."project_widget_layout"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "project_widget_layout_unique" ON "project" USING btree ("widget_layout_id") WHERE "project"."widget_layout_id" is not null;
