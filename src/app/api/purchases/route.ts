import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle, HttpError } from "@/lib/api";
import { purchaseInput } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const rows = await db
      .select({ purchase: schema.purchases, listing: schema.listings })
      .from(schema.purchases)
      .innerJoin(schema.listings, eq(schema.purchases.listingId, schema.listings.id))
      .orderBy(desc(schema.purchases.createdAt));
    return rows.map((r) => ({ ...r.purchase, listing: r.listing }));
  });
}

/**
 * Record a purchase INTENT (user clicked "Buy now" and is being sent to Vinted)
 * or update its status. We NEVER mark a purchase as completed automatically —
 * status only reflects explicit user action, because this app cannot and does
 * not perform the checkout on Vinted.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json();
    const input = purchaseInput.parse(body);

    const [listing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, input.listingId))
      .limit(1);
    if (!listing) throw new HttpError("Listing not found", 404);

    const [existing] = await db
      .select()
      .from(schema.purchases)
      .where(eq(schema.purchases.listingId, input.listingId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(schema.purchases)
        .set({
          status: input.status,
          deliveryPointName: input.deliveryPointName ?? existing.deliveryPointName,
          updatedAt: new Date(),
        })
        .where(eq(schema.purchases.id, existing.id))
        .returning();
      await logEvent("info", "api", `Purchase status -> ${input.status}`, {
        listingId: input.listingId,
      });
      return updated;
    }

    const fees = (listing.serviceFee ?? 0) + (listing.shippingFee ?? 0);
    const [created] = await db
      .insert(schema.purchases)
      .values({
        listingId: input.listingId,
        recordedPrice: listing.price,
        recordedFees: fees || null,
        recordedTotal: listing.totalCost ?? listing.price + fees,
        deliveryPointName: input.deliveryPointName ?? null,
        status: input.status,
      })
      .returning();
    await logEvent("info", "api", "Purchase intent recorded", {
      listingId: input.listingId,
    });
    return created;
  });
}
