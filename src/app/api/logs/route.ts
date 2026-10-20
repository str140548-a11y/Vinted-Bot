import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const url = new URL(req.url);
    const limit = Math.min(300, Number(url.searchParams.get("limit") ?? "100") || 100);
    return db
      .select()
      .from(schema.logEntries)
      .orderBy(desc(schema.logEntries.createdAt))
      .limit(limit);
  });
}
