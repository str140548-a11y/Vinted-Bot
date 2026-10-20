import { eq, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle, HttpError } from "@/lib/api";
import { pickupLocationInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const input = pickupLocationInput.partial().parse(await req.json());

    if (input.isPrimary) {
      // Demote all others.
      await db
        .update(schema.pickupLocations)
        .set({ isPrimary: false })
        .where(ne(schema.pickupLocations.id, params.id));
    }

    const [updated] = await db
      .update(schema.pickupLocations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.pickupLocations.id, params.id))
      .returning();
    if (!updated) throw new HttpError("Not found", 404);
    return updated;
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    await db.delete(schema.pickupLocations).where(eq(schema.pickupLocations.id, params.id));
    return { deleted: true };
  });
}
