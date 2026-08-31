CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"source_text" text NOT NULL,
	"target_lang" varchar(8) NOT NULL,
	"translated_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_source_hash_unique" UNIQUE("source_hash")
);
