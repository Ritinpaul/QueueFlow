import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// For migrations: use max: 1 connection
export const migrationClient = postgres(connectionString, { max: 1 });

// For queries: use connection pool
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema, logger: process.env.NODE_ENV === "development" });

export type Database = typeof db;
export * from "./schema.js";
