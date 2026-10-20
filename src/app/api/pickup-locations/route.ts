import { asc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";
import { pickupLocationInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    return db
      .select()
      .from(schema.pickupLocations)
      .orderBy(asc(schema.pickupLocations.priority));
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const input = pickupLocationInput.parse(await req.json());
    // If this one is primary, demote any existing primary.
    if (input.isPrimary) {
      await db.update(schema.pickupLocations).set({ isPrimary: false });
    }
    const [created] = await db
      .insert(schema.pickupLocations)
      .values({
        name: input.name,
        provider: input.provider ?? null,
        address: input.address ?? null,
        postcode: input.postcode ?? null,
        distanceKm: input.distanceKm ?? null,
        priority: input.priority,
        enabled: input.enabled,
        isPrimary: input.isPrimary,
      })
      .returning();
    return created;
  });
}
