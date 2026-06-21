CREATE TYPE "public"."gainer_exercise_type" AS ENUM('standard', 'pdc', 'duration', 'cardio');--> statement-breakpoint
ALTER TABLE "gainer_sets" ALTER COLUMN "weight" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gainer_sets" ALTER COLUMN "reps" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gainer_exercises" ADD COLUMN "type" "gainer_exercise_type" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "gainer_sets" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "gainer_sets" ADD COLUMN "distance_meters" integer;