import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";
import { startCheckoutSession } from "@/lib/checkout";

export const dynamic = "force-dynamic";

const startInput = z.object({
  listingId: z.string().min(1),
  deliveryPointName: z.string().max(200).optional().nullable(),
  // If provided, starts an OPTIONAL local inspection stopwatch (not a Vinted hold).
  inspectionDurationSec: z.number().int().min(30).max(3600).optional().nullable(),
});

/** List checkout sessions joined with their listing. */
export async function GET() {
  return handle(async () => {
    const rows = await db
      .select({ session: schema.checkoutSessions, listing: schema.listings })
      .from(schema.checkoutSessions)
      .innerJoin(schema.listings, eq(schema.checkoutSessions.listingId, schema.listings.id))
      .orderBy(desc(schema.checkoutSessions.createdAt));
    return rows.map((r) => ({ ...r.session, listing: r.listing }));
  });
}

/** Start (or resume) an assisted checkout session for a listing. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const input = startInput.parse(await req.json());
    return startCheckoutSession(input.listingId, {
      deliveryPointName: input.deliveryPointName,
      inspectionDurationSec: input.inspectionDurationSec,
    });
  });
}
