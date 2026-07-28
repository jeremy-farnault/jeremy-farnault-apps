CREATE TABLE "doser_pill_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text,
	"color" text NOT NULL,
	"days" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doser_pill_types_medicine_id_position_unique" UNIQUE("medicine_id","position")
);
--> statement-breakpoint
ALTER TABLE "doser_pill_types" ADD CONSTRAINT "doser_pill_types_medicine_id_doser_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."doser_medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doser_medicines" DROP COLUMN "days_on";--> statement-breakpoint
ALTER TABLE "doser_medicines" DROP COLUMN "color";