import { neon } from "@neondatabase/serverless";

type ExerciseType = "standard" | "pdc" | "duration" | "cardio";

const EXERCISES: { name: string; type: ExerciseType }[] = [
  { name: "Bench Press", type: "standard" },
  { name: "Incline Bench Press", type: "standard" },
  { name: "Overhead Press", type: "standard" },
  { name: "Dips", type: "pdc" },
  { name: "Push-Up", type: "pdc" },
  { name: "Deadlift", type: "standard" },
  { name: "Pull-Up", type: "pdc" },
  { name: "Barbell Row", type: "standard" },
  { name: "Lat Pulldown", type: "standard" },
  { name: "Face Pull", type: "standard" },
  { name: "Squat", type: "standard" },
  { name: "Romanian Deadlift", type: "standard" },
  { name: "Leg Press", type: "standard" },
  { name: "Leg Curl", type: "standard" },
  { name: "Leg Extension", type: "standard" },
  { name: "Bicep Curl", type: "standard" },
  { name: "Hammer Curl", type: "standard" },
  { name: "Tricep Pushdown", type: "standard" },
  { name: "Skull Crusher", type: "standard" },
  { name: "Plank", type: "duration" },
];

async function seed() {
  const sql = neon(process.env.DATABASE_URL as string);

  const existing = await sql`SELECT id FROM gainer_exercises WHERE user_id IS NULL`;
  if (existing.length > 0) {
    console.log(`Already seeded (${existing.length} exercises found). Skipping.`);
    return;
  }

  for (const { name, type } of EXERCISES) {
    await sql`INSERT INTO gainer_exercises (name, is_custom, type) VALUES (${name}, false, ${type})`;
    console.log(`  ✓ ${name} (${type})`);
  }
  console.log(`\nSeeded ${EXERCISES.length} exercises.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
