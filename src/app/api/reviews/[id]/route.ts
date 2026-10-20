import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle, HttpError } from "@/lib/api";
import { reviewDecisionInput } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Record a decision on a review window.
 *   approved  -> user intends to buy (the UI then opens the real Vinted listing)
 *   rejected  -> cancel the pending action, mark rejected
 *   reviewing -> "keep reviewing" (no-op status refresh)
 *
 * IMPORTANT: approving does NOT purchase anything and does NOT reserve the item
 * on Vinted. It only records the local decision.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const body = await req.json();
    const { decision, notes } = reviewDecisionInput.parse(body);

    const [existing] = await db
      .select()
      .from(schema.reviewWindows)
      .where(eq(schema.reviewWindows.id, params.id))
      .limit(1);
    if (!existing) throw new HttpError("Not found", 404);

    if (existing.status === "expired" && decision !== "reviewing") {
      // Allow re-opening history but not approving an expired window silently.
      throw new HttpError("Review window has expired. Reopen the listing manually.", 409);
    }

    const [updated] = await db
      .update(schema.reviewWindows)
      .set({
        status: decision,
        notes: notes ?? existing.notes,
        decidedAt: decision === "reviewing" ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.reviewWindows.id, params.id))
      .returning();

    await logEvent("info", "api", `Review window ${decision}`, {
      reviewId: params.id,
      listingId: existing.listingId,
    });
    return updated;
  });
}
