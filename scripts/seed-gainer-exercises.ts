import { neon } from "@neondatabase/serverless";

const EXERCISES = [
  "Bench Press",
  "Incline Bench Press",
  "Overhead Press",
  "Dips",
  "Push-Up",
  "Deadlift",
  "Pull-Up",
  "Barbell Row",
  "Lat Pulldown",
  "Face Pull",
  "Squat",
  "Romanian Deadlift",
  "Leg Press",
  "Leg Curl",
  "Leg Extension",
  "Bicep Curl",
  "Hammer Curl",
  "Tricep Pushdown",
  "Skull Crusher",
  "Plank",
];

async function seed() {
  const sql = neon(process.env.DATABASE_URL as string);

  const existing = await sql`SELECT id FROM gainer_exercises WHERE user_id IS NULL`;
  if (existing.length > 0) {
    console.log(`Already seeded (${existing.length} exercises found). Skipping.`);
    return;
  }

  for (const name of EXERCISES) {
    await sql`INSERT INTO gainer_exercises (name, is_custom) VALUES (${name}, false)`;
    console.log(`  ✓ ${name}`);
  }
  console.log(`\nSeeded ${EXERCISES.length} exercises.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
