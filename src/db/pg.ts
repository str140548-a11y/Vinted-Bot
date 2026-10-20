/**
 * Postgres connection for production.
 *
 * The app uses SQLite by default. To run on Postgres:
 *   1. Set DATABASE_URL to a postgres:// connection string.
 *   2. Generate Postgres migrations:  DATABASE_URL=postgres://... npm run db:generate
 *   3. Apply them:                     DATABASE_URL=postgres://... npm run db:migrate
 *   4. Import `db` from "@/db/pg" wherever you need it, OR (recommended) set the
 *      DB_DRIVER=pg env and have your deployment alias "@/db" to this module.
 *
 * The Drizzle schema in ./schema.ts uses portable column types, so the same
 * logical schema maps cleanly to Postgres. drizzle-kit emits Postgres DDL when
 * DATABASE_URL is a postgres URL (see drizzle.config.ts).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForPg = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const url = process.env.DATABASE_URL;
if (!url || !(url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
  throw new Error("@/db/pg requires a postgres:// DATABASE_URL");
}

const client = globalForPg.pgClient ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForPg.pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
