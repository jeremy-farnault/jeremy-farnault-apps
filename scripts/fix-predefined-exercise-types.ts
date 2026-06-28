import { neon } from "@neondatabase/serverless";

async function fix() {
  const sql = neon(process.env.DATABASE_URL as string);

  const pdcExercises = ["Pull-Up", "Push-Up", "Dips"];
  const durationExercises = ["Plank"];

  for (const name of pdcExercises) {
    const result =
      await sql`UPDATE gainer_exercises SET type = 'pdc' WHERE user_id IS NULL AND name = ${name}`;
    console.log(`  pdc: ${name} (${result.count} row updated)`);
  }

  for (const name of durationExercises) {
    const result =
      await sql`UPDATE gainer_exercises SET type = 'duration' WHERE user_id IS NULL AND name = ${name}`;
    console.log(`  duration: ${name} (${result.count} row updated)`);
  }

  console.log("\nDone.");
}

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});
