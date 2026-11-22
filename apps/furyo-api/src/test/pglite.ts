import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

/**
 * An in-process Postgres with the real furyo_saves migration (and a stub `user` table with
 * user-1 and user-2), for route tests: `vi.mock("@jf/db", …)` swaps it in for Neon.
 */
export async function testDb() {
  const client = new PGlite();
  const migration = readFileSync(
    resolve(__dirname, "../../../../packages/db/drizzle/0038_furyo_saves.sql"),
    "utf8"
  ).replace(/--> statement-breakpoint/g, "");
  await client.exec(`CREATE TABLE "user" ("id" text PRIMARY KEY NOT NULL);
    INSERT INTO "user" VALUES ('user-1'), ('user-2');
    ${migration}`);
  return { db: drizzle(client), testClient: client };
}
