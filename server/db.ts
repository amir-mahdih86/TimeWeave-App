import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Running in offline/memory mode for backend.");
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db",
  max: 1 // Minimal connections since we aren't really using it for the offline app
});

// We export db but for this specific offline PWA it might not be connected effectively
export const db = drizzle(pool, { schema });
