import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | undefined;

function getDb(): DrizzleDb {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const sql = neon(databaseUrl);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Lazy proxy — the real connection is only created on first access,
// not at module load time. This prevents build failures when DATABASE_URL
// is only available at runtime (not during static analysis).
export const db = new Proxy({} as DrizzleDb, {
  get(_, prop: string | symbol) {
    return getDb()[prop as keyof DrizzleDb];
  },
});

export type Db = DrizzleDb;
