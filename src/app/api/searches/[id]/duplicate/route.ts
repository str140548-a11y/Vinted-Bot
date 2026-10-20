import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const [src] = await db
      .select()
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.id, params.id))
      .limit(1);
    if (!src) throw new HttpError("Not found", 404);

    const { id, createdAt, updatedAt, lastCheckedAt, lastStatus, lastError, ...rest } = src;
    const [copy] = await db
      .insert(schema.savedSearches)
      .values({ ...rest, name: `${src.name} (copy)` })
      .returning();
    return copy;
  });
}
