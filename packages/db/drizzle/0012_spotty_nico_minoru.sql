ALTER TABLE "financer_entries" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "financer_summaries" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;