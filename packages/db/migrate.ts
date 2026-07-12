/**
 * Custom migration runner — bypasses drizzle-kit CLI issues on Windows.
 * Uses drizzle-orm's built-in migrator directly with the postgres client.
 */
import { config } from "dotenv";
import { resolve } from "path";

// Load env from local .env first, then monorepo root
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  // Dynamic imports after env is loaded
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const postgres = (await import("postgres")).default;
  const path = await import("path");

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    console.error("   Check packages/db/.env or root .env");
    process.exit(1);
  }

  console.log("🔗 Connecting to database...");
  console.log(`   URL: ${DATABASE_URL.replace(/:[^:@]*@/, ":***@")}`);

  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  const migrationsFolder = path.resolve(process.cwd(), "./drizzle");
  console.log("📦 Running migrations from:", migrationsFolder);

  try {
    await migrate(db, { migrationsFolder });
    console.log("✅ All migrations applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
    console.log("🔌 Database connection closed.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
