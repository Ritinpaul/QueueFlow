import type { Config } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// Load local .env (packages/db/.env) — used by drizzle-kit CLI
config({ path: resolve(process.cwd(), ".env") });
// Also try monorepo root .env as fallback
config({ path: resolve(process.cwd(), "../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check packages/db/.env or root .env");
}

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
