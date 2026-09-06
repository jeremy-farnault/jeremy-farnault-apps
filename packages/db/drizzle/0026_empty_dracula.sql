CREATE TABLE "organiser_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organiser_card_tags" (
	"card_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "organiser_card_tags_card_id_tag_id_pk" PRIMARY KEY("card_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "organiser_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"column_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"color" text,
	"deadline" date,
	"position" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organiser_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"position" text NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organiser_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organiser_tags_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "organiser_boards" ADD CONSTRAINT "organiser_boards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_card_tags" ADD CONSTRAINT "organiser_card_tags_card_id_organiser_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."organiser_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_card_tags" ADD CONSTRAINT "organiser_card_tags_tag_id_organiser_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."organiser_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_cards" ADD CONSTRAINT "organiser_cards_column_id_organiser_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."organiser_columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_cards" ADD CONSTRAINT "organiser_cards_board_id_organiser_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."organiser_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_cards" ADD CONSTRAINT "organiser_cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_columns" ADD CONSTRAINT "organiser_columns_board_id_organiser_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."organiser_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_columns" ADD CONSTRAINT "organiser_columns_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organiser_tags" ADD CONSTRAINT "organiser_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organiser_cards_column_id_position_idx" ON "organiser_cards" USING btree ("column_id","position");--> statement-breakpoint
CREATE INDEX "organiser_columns_board_id_position_idx" ON "organiser_columns" USING btree ("board_id","position");