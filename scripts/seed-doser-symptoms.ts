import { neon } from "@neondatabase/serverless";

const SYMPTOMS = ["Headache", "Nausea", "Fatigue", "Cramps", "Mood swings", "Bloating"];

async function seed() {
  const sql = neon(process.env.DATABASE_URL as string);

  const existing = await sql`SELECT id FROM doser_symptoms WHERE user_id IS NULL`;
  if (existing.length > 0) {
    console.log(`Already seeded (${existing.length} symptoms found). Skipping.`);
    return;
  }

  for (const name of SYMPTOMS) {
    await sql`INSERT INTO doser_symptoms (name, is_custom) VALUES (${name}, false)`;
    console.log(`  ✓ ${name}`);
  }
  console.log(`\nSeeded ${SYMPTOMS.length} symptoms.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
