import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle, HttpError } from "@/lib/api";
import { savedSearchBase } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const [row] = await db
      .select()
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.id, params.id))
      .limit(1);
    if (!row) throw new HttpError("Not found", 404);
    return row;
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const body = await req.json();
    const input = savedSearchBase.partial().parse(body);

    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(input)) {
      if (["preferredBrands", "excludedBrands", "excludedKeywords", "rawParams"].includes(k)) {
        update[k] = JSON.stringify(v);
      } else {
        update[k] = v;
      }
    }

    const [updated] = await db
      .update(schema.savedSearches)
      .set(update)
      .where(eq(schema.savedSearches.id, params.id))
      .returning();
    if (!updated) throw new HttpError("Not found", 404);
    return updated;
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    await db.delete(schema.savedSearches).where(eq(schema.savedSearches.id, params.id));
    return { deleted: true };
  });
}
