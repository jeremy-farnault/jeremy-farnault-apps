CREATE TABLE "exchange_rates" (
	"currency" text PRIMARY KEY NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Carry over Financer's cached rates so the first read doesn't have to refetch.
INSERT INTO "exchange_rates" ("currency", "rate", "updated_at")
SELECT "currency", "rate", "updated_at" FROM "financer_exchange_rates"
ON CONFLICT ("currency") DO NOTHING;
