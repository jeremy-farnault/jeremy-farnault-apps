import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema/index";

neonConfig.webSocketConstructor = ws;

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | undefined;

function getDb(): DrizzleDb {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const pool = new Pool({ connectionString: databaseUrl });
    _db = drizzle(pool, { schema });
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
