/**
 * Apply SQL migrations. Works for both SQLite (default) and Postgres based on
 * DATABASE_URL. Run with `npm run db:migrate`.
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    // Lazy-import so SQLite-only installs don't need these at runtime.
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
    await client.end();
    console.log("✓ Postgres migrations applied");
    return;
  }

  const sqlite = new Database(url.replace(/^file:/, ""));
  sqlite.pragma("foreign_keys = ON");
  const db = drizzleSqlite(sqlite);
  migrateSqlite(db, { migrationsFolder: "./drizzle" });
  console.log("✓ SQLite migrations applied");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
