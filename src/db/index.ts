import { createRequire } from "node:module";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Database singleton with a runtime-selected driver.
 *
 * - SQLite (default): DATABASE_URL="file:./dev.db" — zero infra, runs anywhere,
 *   no external binary downloads.
 * - Postgres (production): DATABASE_URL="postgres://…" — uses drizzle postgres-js.
 *
 * App query code avoids driver-specific sugar (e.g. better-sqlite3's `.get()`);
 * use the `first()` helper below for "fetch one row" so the same code runs on
 * both drivers. The exported `db` type is the common Drizzle surface the app
 * relies on.
 */

type AnyDb = ReturnType<typeof drizzleSqlite<typeof schema>> & {
  // postgres-js driver has a structurally compatible query API for our usage.
  [k: string]: unknown;
};

const globalForDb = globalThis as unknown as {
  db?: AnyDb;
  sqlite?: Database.Database;
};

function resolveSqlitePath(url: string): string {
  if (url.startsWith("file:")) return url.slice("file:".length);
  return url;
}

function create(): AnyDb {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    // Lazy require (via createRequire) so SQLite-only environments don't load
    // the pg deps, and so this stays CJS-interop friendly inside Next.
    const nodeRequire = createRequire(import.meta.url);
    const postgres = nodeRequire("postgres") as (
      connection: string,
      opts?: Record<string, unknown>,
    ) => unknown;
    const { drizzle: drizzlePg } = nodeRequire("drizzle-orm/postgres-js") as {
      drizzle: (client: unknown, opts: { schema: typeof schema }) => AnyDb;
    };
    const client = postgres(url, { max: 10 });
    return drizzlePg(client, { schema });
  }

  const sqlite = new Database(resolveSqlitePath(url));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  globalForDb.sqlite = sqlite;
  return drizzleSqlite(sqlite, { schema }) as unknown as AnyDb;
}

export const db = (globalForDb.db ?? (globalForDb.db = create())) as ReturnType<
  typeof drizzleSqlite<typeof schema>
>;

export { schema };
