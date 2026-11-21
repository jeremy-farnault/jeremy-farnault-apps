CREATE TABLE "furyo_saves" (
	"user_id" text PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "furyo_saves" ADD CONSTRAINT "furyo_saves_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;