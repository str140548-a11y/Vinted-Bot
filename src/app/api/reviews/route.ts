import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";
import { expireReviewWindows } from "@/lib/monitor";

export const dynamic = "force-dynamic";

/**
 * List review windows joined with their listing. Expires any overdue windows
 * first so the queue is always accurate even without the worker running.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await expireReviewWindows();
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // optional filter

    const rows = await db
      .select({
        review: schema.reviewWindows,
        listing: schema.listings,
      })
      .from(schema.reviewWindows)
      .innerJoin(schema.listings, eq(schema.reviewWindows.listingId, schema.listings.id))
      .orderBy(desc(schema.reviewWindows.startedAt));

    return rows
      .filter((r) => !status || r.review.status === status)
      .map((r) => ({ ...r.review, listing: r.listing }));
  });
}
