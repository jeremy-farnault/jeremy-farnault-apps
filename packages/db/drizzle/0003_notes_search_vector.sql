ALTER TABLE "notes"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED;
--> statement-breakpoint
CREATE INDEX "notes_search_vector_idx" ON "notes" USING gin("search_vector");
