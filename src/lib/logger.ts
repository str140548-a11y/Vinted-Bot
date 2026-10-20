import pino from "pino";
import { db, schema } from "@/db";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
    : undefined,
});

type Scope = "monitor" | "notify" | "api" | "worker" | "app";
type Level = "info" | "warn" | "error";

/**
 * Logs to stdout (pino) AND persists to the DB so Settings > Logs can show
 * recent structured entries. DB writes are best-effort (never throw).
 */
export async function logEvent(
  level: Level,
  scope: Scope,
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  logger[level]({ scope, ...meta }, message);
  try {
    await db.insert(schema.logEntries).values({
      level,
      scope,
      message,
      meta: meta ? JSON.stringify(meta) : null,
    });
  } catch {
    // Swallow — logging must never crash the app.
  }
}
