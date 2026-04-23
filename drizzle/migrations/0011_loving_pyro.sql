CREATE TABLE "idea_subtask_dependency" (
	"subtask_id" uuid NOT NULL,
	"depends_on_subtask_id" uuid NOT NULL,
	CONSTRAINT "idea_subtask_dependency_subtask_id_depends_on_subtask_id_pk" PRIMARY KEY("subtask_id","depends_on_subtask_id")
);
--> statement-breakpoint
CREATE TABLE "idea_subtask" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_task_dependency" (
	"task_id" uuid NOT NULL,
	"depends_on_task_id" uuid NOT NULL,
	CONSTRAINT "idea_task_dependency_task_id_depends_on_task_id_pk" PRIMARY KEY("task_id","depends_on_task_id")
);
--> statement-breakpoint
CREATE TABLE "idea_task" (
	"id" uuid PRIMARY KEY NOT NULL,
	"idea_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_subtask_dependency" ADD CONSTRAINT "idea_subtask_dependency_subtask_id_idea_subtask_id_fk" FOREIGN KEY ("subtask_id") REFERENCES "public"."idea_subtask"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea_subtask_dependency" ADD CONSTRAINT "idea_subtask_dependency_depends_on_subtask_id_idea_subtask_id_fk" FOREIGN KEY ("depends_on_subtask_id") REFERENCES "public"."idea_subtask"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea_subtask" ADD CONSTRAINT "idea_subtask_task_id_idea_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."idea_task"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea_task_dependency" ADD CONSTRAINT "idea_task_dependency_task_id_idea_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."idea_task"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea_task_dependency" ADD CONSTRAINT "idea_task_dependency_depends_on_task_id_idea_task_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."idea_task"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idea_task" ADD CONSTRAINT "idea_task_idea_id_idea_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."idea"("id") ON DELETE cascade ON UPDATE no action;
