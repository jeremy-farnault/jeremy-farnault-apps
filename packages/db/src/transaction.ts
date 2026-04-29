import { Pool, neonConfig } from "@neondatabase/serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema/index";

neonConfig.webSocketConstructor = ws;

type Tx = NeonDatabase<typeof schema>;

export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    return await drizzle(pool, { schema }).transaction(fn);
  } finally {
    await pool.end();
  }
}
