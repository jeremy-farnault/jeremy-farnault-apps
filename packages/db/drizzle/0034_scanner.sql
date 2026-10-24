CREATE TYPE "public"."scanner_item_status" AS ENUM('wishlist', 'bought');--> statement-breakpoint
CREATE TYPE "public"."scanner_link_status" AS ENUM('ok', 'failed');--> statement-breakpoint
CREATE TABLE "scanner_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"image_key" text,
	"status" "scanner_item_status" DEFAULT 'wishlist' NOT NULL,
	"bought_price" integer,
	"bought_currency" text,
	"bought_store" text,
	"bought_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scanner_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"store" text NOT NULL,
	"region" text,
	"edition_id" text,
	"match_key" text NOT NULL,
	"last_status" "scanner_link_status" DEFAULT 'ok' NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL,
	"last_success_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scanner_links_user_url_region_edition_unique" UNIQUE NULLS NOT DISTINCT("user_id","normalized_url","region","edition_id")
);
--> statement-breakpoint
CREATE TABLE "scanner_price_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"normal_price" integer NOT NULL,
	"sale_price" integer,
	"currency" text NOT NULL,
	"in_stock" boolean NOT NULL,
	"discount_percent" integer,
	"sale_ends_at" timestamp,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scanner_items" ADD CONSTRAINT "scanner_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_links" ADD CONSTRAINT "scanner_links_item_id_scanner_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."scanner_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_links" ADD CONSTRAINT "scanner_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_price_checks" ADD CONSTRAINT "scanner_price_checks_link_id_scanner_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."scanner_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scanner_items_user_id_status_idx" ON "scanner_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "scanner_links_item_id_idx" ON "scanner_links" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "scanner_price_checks_link_id_checked_at_idx" ON "scanner_price_checks" USING btree ("link_id","checked_at");