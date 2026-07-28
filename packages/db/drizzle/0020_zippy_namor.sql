CREATE TABLE "doser_day_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_on" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doser_day_overrides_medicine_id_date_unique" UNIQUE("medicine_id","date")
);
--> statement-breakpoint
CREATE TABLE "doser_dose_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"date" date NOT NULL,
	"taken" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doser_dose_logs_medicine_id_date_unique" UNIQUE("medicine_id","date")
);
--> statement-breakpoint
CREATE TABLE "doser_medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"days_on" integer NOT NULL,
	"days_off" integer NOT NULL,
	"cycle_start_date" date NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doser_symptom_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symptom_log_id" uuid NOT NULL,
	"symptom_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doser_symptom_log_entries_symptom_log_id_symptom_id_unique" UNIQUE("symptom_log_id","symptom_id")
);
--> statement-breakpoint
CREATE TABLE "doser_symptom_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doser_symptom_logs_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "doser_symptoms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doser_day_overrides" ADD CONSTRAINT "doser_day_overrides_medicine_id_doser_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."doser_medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doser_dose_logs" ADD CONSTRAINT "doser_dose_logs_medicine_id_doser_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."doser_medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doser_medicines" ADD CONSTRAINT "doser_medicines_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doser_symptom_log_entries" ADD CONSTRAINT "doser_symptom_log_entries_symptom_log_id_doser_symptom_logs_id_fk" FOREIGN KEY ("symptom_log_id") REFERENCES "public"."doser_symptom_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doser_symptom_log_entries" ADD CONSTRAINT "doser_symptom_log_entries_symptom_id_doser_symptoms_id_fk" FOREIGN KEY ("symptom_id") REFERENCES "public"."doser_symptoms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doser_symptom_logs" ADD CONSTRAINT "doser_symptom_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doser_symptoms" ADD CONSTRAINT "doser_symptoms_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;