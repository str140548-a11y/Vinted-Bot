import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Settings } from "@/db/schema";

/**
 * Fetch the singleton settings row, creating it with defaults if missing.
 * The app is single-user / self-hosted, so one settings row is sufficient.
 */
export async function getSettings(): Promise<Settings> {
  const [existing] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, "singleton"))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(schema.settings)
    .values({ id: "singleton" })
    .returning();
  return created;
}

export async function getMonitorHealth() {
  const [existing] = await db
    .select()
    .from(schema.monitorHealth)
    .where(eq(schema.monitorHealth.id, "singleton"))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(schema.monitorHealth)
    .values({ id: "singleton" })
    .returning();
  return created;
}
