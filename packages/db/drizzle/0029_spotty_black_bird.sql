CREATE TABLE "unifier_arcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"position" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unifier_persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arc_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"important" boolean DEFAULT false NOT NULL,
	"flagged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unifier_slot_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"value" text,
	CONSTRAINT "unifier_slot_values_person_id_slot_id_unique" UNIQUE("person_id","slot_id")
);
--> statement-breakpoint
CREATE TABLE "unifier_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arc_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"position" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unifier_touches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"note" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unifier_arcs" ADD CONSTRAINT "unifier_arcs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_persons" ADD CONSTRAINT "unifier_persons_arc_id_unifier_arcs_id_fk" FOREIGN KEY ("arc_id") REFERENCES "public"."unifier_arcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_persons" ADD CONSTRAINT "unifier_persons_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_slot_values" ADD CONSTRAINT "unifier_slot_values_person_id_unifier_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."unifier_persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_slot_values" ADD CONSTRAINT "unifier_slot_values_slot_id_unifier_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."unifier_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_slot_values" ADD CONSTRAINT "unifier_slot_values_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_slots" ADD CONSTRAINT "unifier_slots_arc_id_unifier_arcs_id_fk" FOREIGN KEY ("arc_id") REFERENCES "public"."unifier_arcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_slots" ADD CONSTRAINT "unifier_slots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_touches" ADD CONSTRAINT "unifier_touches_person_id_unifier_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."unifier_persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifier_touches" ADD CONSTRAINT "unifier_touches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unifier_arcs_user_id_position_idx" ON "unifier_arcs" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "unifier_persons_arc_id_idx" ON "unifier_persons" USING btree ("arc_id");--> statement-breakpoint
CREATE INDEX "unifier_slots_arc_id_position_idx" ON "unifier_slots" USING btree ("arc_id","position");--> statement-breakpoint
CREATE INDEX "unifier_touches_person_id_occurred_at_idx" ON "unifier_touches" USING btree ("person_id","occurred_at" DESC NULLS LAST);