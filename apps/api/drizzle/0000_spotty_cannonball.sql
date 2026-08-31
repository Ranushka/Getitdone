CREATE TYPE "public"."item_status" AS ENUM('pending', 'done');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('in_progress', 'tech_signed_off', 'completed');--> statement-breakpoint
CREATE TYPE "public"."signoff_role" AS ENUM('technician', 'manager');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"url" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"comment" text,
	"status" "item_status" DEFAULT 'pending' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"notes" text,
	"share_token" varchar(24) NOT NULL,
	"status" "job_status" DEFAULT 'in_progress' NOT NULL,
	"manager_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "sign_offs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"role" "signoff_role" NOT NULL,
	"name" varchar(255) NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"image" varchar(500),
	"password_hash" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_item_id_checklist_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."checklist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_offs" ADD CONSTRAINT "sign_offs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sign_offs_job_role_idx" ON "sign_offs" USING btree ("job_id","role");