CREATE TYPE "public"."vision_message_role" AS ENUM('assistant', 'user');
--> statement-breakpoint
CREATE TABLE "vision" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled vision' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vision_message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vision_id" uuid NOT NULL,
	"role" "vision_message_role" NOT NULL,
	"content" text NOT NULL,
	"order" integer NOT NULL,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vision_collaborator" (
	"vision_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vision_collaborator_vision_id_user_id_pk" PRIMARY KEY("vision_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "vision_summary_document" (
	"vision_id" uuid PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vision" ADD CONSTRAINT "vision_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vision" ADD CONSTRAINT "vision_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vision_message" ADD CONSTRAINT "vision_message_vision_id_vision_id_fk" FOREIGN KEY ("vision_id") REFERENCES "public"."vision"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vision_message" ADD CONSTRAINT "vision_message_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vision_collaborator" ADD CONSTRAINT "vision_collaborator_vision_id_vision_id_fk" FOREIGN KEY ("vision_id") REFERENCES "public"."vision"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vision_collaborator" ADD CONSTRAINT "vision_collaborator_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vision_collaborator" ADD CONSTRAINT "vision_collaborator_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vision_summary_document" ADD CONSTRAINT "vision_summary_document_vision_id_vision_id_fk" FOREIGN KEY ("vision_id") REFERENCES "public"."vision"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "vision_message_order_unique" ON "vision_message" USING btree ("vision_id","order");
