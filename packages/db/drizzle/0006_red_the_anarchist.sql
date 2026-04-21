CREATE TYPE "public"."routiner_habit_type" AS ENUM('boolean', 'numeric', 'time');--> statement-breakpoint
CREATE TABLE "routiner_habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "routiner_habit_type" NOT NULL,
	"start_date" date NOT NULL,
	"color" text NOT NULL,
	"description" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routiner_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"value" text NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "routiner_logs_habit_id_date_unique" UNIQUE("habit_id","date")
);
--> statement-breakpoint
ALTER TABLE "routiner_habits" ADD CONSTRAINT "routiner_habits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routiner_logs" ADD CONSTRAINT "routiner_logs_habit_id_routiner_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."routiner_habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routiner_logs" ADD CONSTRAINT "routiner_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;