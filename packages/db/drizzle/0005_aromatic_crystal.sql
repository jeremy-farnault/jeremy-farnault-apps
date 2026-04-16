CREATE TYPE "public"."journaler_category" AS ENUM('Movie', 'TV Show', 'Book', 'Game', 'Manga');--> statement-breakpoint
CREATE TABLE "journaler_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"category" "journaler_category" NOT NULL,
	"date" date NOT NULL,
	"comment" text,
	"rating" integer,
	"image_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "journaler_entries_rating_check" CHECK ("journaler_entries"."rating" >= 1 AND "journaler_entries"."rating" <= 10)
);
--> statement-breakpoint
ALTER TABLE "journaler_entries" ADD CONSTRAINT "journaler_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;