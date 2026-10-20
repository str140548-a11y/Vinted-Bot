import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const isPg = url.startsWith("postgres://") || url.startsWith("postgresql://");

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: isPg ? "postgresql" : "sqlite",
  dbCredentials: isPg ? { url } : { url: url.replace(/^file:/, "") },
} satisfies Config;
