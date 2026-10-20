import { and, desc, eq, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const url = new URL(req.url);
    const searchId = url.searchParams.get("searchId");
    const availability = url.searchParams.get("availability");
    const sinceToday = url.searchParams.get("today") === "1";
    const limit = Math.min(200, Number(url.searchParams.get("limit") ?? "60") || 60);

    const conditions = [];
    if (searchId) conditions.push(eq(schema.listings.savedSearchId, searchId));
    if (availability) conditions.push(eq(schema.listings.availability, availability));
    if (sinceToday) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(schema.listings.firstSeenAt, start));
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(schema.listings)
      .where(where)
      .orderBy(desc(schema.listings.firstSeenAt))
      .limit(limit);
    return rows;
  });
}
