import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index";

function createDb() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export const db = createDb();
export type Db = typeof db;
