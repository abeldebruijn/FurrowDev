CREATE TYPE "public"."concept_project_chat_message_type" AS ENUM('agent', 'person');--> statement-breakpoint
CREATE TABLE "admins" (
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	CONSTRAINT "admins_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "concept_project_chat_message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"order" integer NOT NULL,
	"type" "concept_project_chat_message_type" NOT NULL,
	"user_id" uuid,
	"concept_project_chat_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_project_chat" (
	"id" uuid PRIMARY KEY NOT NULL,
	"concept_project_id" uuid NOT NULL,
	CONSTRAINT "concept_project_chat_concept_project_id_unique" UNIQUE("concept_project_id")
);
--> statement-breakpoint
CREATE TABLE "concept_project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"roadmap_id" uuid,
	"user_owner" uuid,
	"org_owner" uuid,
	CONSTRAINT "concept_project_exactly_one_owner" CHECK ((case when "concept_project"."user_owner" is null then 0 else 1 end) + (case when "concept_project"."org_owner" is null then 0 else 1 end) = 1)
);
--> statement-breakpoint
CREATE TABLE "maintainers" (
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	CONSTRAINT "maintainers_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"concept_project_id" uuid,
	"user_owner" uuid,
	"org_owner" uuid,
	CONSTRAINT "project_exactly_one_owner" CHECK ((case when "project"."user_owner" is null then 0 else 1 end) + (case when "project"."org_owner" is null then 0 else 1 end) = 1)
);
--> statement-breakpoint
CREATE TABLE "roadmap_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"major_version" integer NOT NULL,
	"minor_version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap" (
	"id" uuid PRIMARY KEY NOT NULL,
	"root_roadmap_id" uuid,
	"embed_url" text,
	"current_major" integer DEFAULT 0 NOT NULL,
	"current_minor" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workos_user_id" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_workos_user_id_unique" UNIQUE("workos_user_id")
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_project_chat_message" ADD CONSTRAINT "concept_project_chat_message_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_project_chat_message" ADD CONSTRAINT "concept_project_chat_message_concept_project_chat_id_concept_project_chat_id_fk" FOREIGN KEY ("concept_project_chat_id") REFERENCES "public"."concept_project_chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_project_chat" ADD CONSTRAINT "concept_project_chat_concept_project_id_concept_project_id_fk" FOREIGN KEY ("concept_project_id") REFERENCES "public"."concept_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_project" ADD CONSTRAINT "concept_project_roadmap_id_roadmap_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmap"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_project" ADD CONSTRAINT "concept_project_user_owner_users_id_fk" FOREIGN KEY ("user_owner") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_project" ADD CONSTRAINT "concept_project_org_owner_organisation_id_fk" FOREIGN KEY ("org_owner") REFERENCES "public"."organisation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintainers" ADD CONSTRAINT "maintainers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintainers" ADD CONSTRAINT "maintainers_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation" ADD CONSTRAINT "organisation_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_concept_project_id_concept_project_id_fk" FOREIGN KEY ("concept_project_id") REFERENCES "public"."concept_project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_owner_users_id_fk" FOREIGN KEY ("user_owner") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_org_owner_organisation_id_fk" FOREIGN KEY ("org_owner") REFERENCES "public"."organisation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_item" ADD CONSTRAINT "roadmap_item_roadmap_id_roadmap_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmap"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_item" ADD CONSTRAINT "roadmap_item_parent_id_roadmap_item_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."roadmap_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap" ADD CONSTRAINT "roadmap_root_roadmap_id_roadmap_id_fk" FOREIGN KEY ("root_roadmap_id") REFERENCES "public"."roadmap"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "concept_project_chat_message_order_unique" ON "concept_project_chat_message" USING btree ("concept_project_chat_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "concept_project_user_owner_name_unique" ON "concept_project" USING btree ("name","user_owner") WHERE "concept_project"."name" is not null and "concept_project"."user_owner" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "concept_project_org_owner_name_unique" ON "concept_project" USING btree ("name","org_owner") WHERE "concept_project"."name" is not null and "concept_project"."org_owner" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "project_concept_project_unique" ON "project" USING btree ("concept_project_id") WHERE "project"."concept_project_id" is not null;