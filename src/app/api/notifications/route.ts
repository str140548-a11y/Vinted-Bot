import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get("limit") ?? "40") || 40);
    return db
      .select()
      .from(schema.notifications)
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit);
  });
}

/** Mark all as read, or a single one via ?id=. */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, id));
    } else {
      await db.update(schema.notifications).set({ read: true });
    }
    return { ok: true };
  });
}
