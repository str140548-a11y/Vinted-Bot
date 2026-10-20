import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logEvent } from "./logger";

/**
 * Assisted checkout — honest capabilities.
 *
 * WHAT THIS DOES:
 *   - Records your journey toward Vinted's REAL checkout (inspecting → launched
 *     → completed/abandoned).
 *   - Builds a deep link straight to the genuine Vinted listing, where the real
 *     "Buy now" lives. Opening that link and tapping Buy now is what makes
 *     Vinted create its genuine pending-payment hold.
 *   - Optionally runs a LOCAL inspection stopwatch you choose to start.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO (and cannot, safely/legally):
 *   - Open Vinted's checkout session for you (no public API; automating the
 *     authenticated flow would violate Vinted's ToS).
 *   - Create, extend, measure or guarantee Vinted's pending-payment hold. That
 *     hold is entirely Vinted's; we never assume it is 15 minutes or any fixed
 *     duration.
 *   - Touch payment authentication (3DS/SCA) — that is between you, Vinted's
 *     payment processor and your bank.
 *   - Store or replay payment credentials, or simulate a completed purchase.
 */

export type CheckoutStatus = "inspecting" | "launched" | "completed" | "abandoned";

/**
 * Build the fastest honest handoff link to the real listing. Vinted does not
 * expose a public "jump straight into checkout" URL for third parties, so the
 * genuine, reliable target is the canonical listing page (where Buy now lives).
 * We pass the known listing URL straight through.
 */
export function buildCheckoutDeepLink(listingUrl: string): string {
  // If a future authorized Vinted integration exposes a checkout deep link,
  // this is the single place to adopt it (within its documented capabilities).
  return listingUrl;
}

export async function startCheckoutSession(
  listingId: string,
  opts?: { deliveryPointName?: string | null; inspectionDurationSec?: number | null },
) {
  const [listing] = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.id, listingId))
    .limit(1);
  if (!listing) throw new Error("Listing not found");

  // Reuse an open session for this listing if one exists.
  const [open] = await db
    .select()
    .from(schema.checkoutSessions)
    .where(eq(schema.checkoutSessions.listingId, listingId))
    .limit(1);
  if (open && (open.status === "inspecting" || open.status === "launched")) {
    return open;
  }

  const [created] = await db
    .insert(schema.checkoutSessions)
    .values({
      listingId,
      priceAtStart: listing.price,
      totalAtStart: listing.totalCost ?? null,
      deliveryPointName: opts?.deliveryPointName ?? null,
      inspectionDurationSec: opts?.inspectionDurationSec ?? null,
      inspectionStartedAt: opts?.inspectionDurationSec ? new Date() : null,
      status: "inspecting",
    })
    .returning();

  await logEvent("info", "api", "Checkout session started (inspecting)", {
    listingId,
    sessionId: created.id,
  });
  return created;
}

export async function transitionCheckout(
  sessionId: string,
  status: CheckoutStatus,
  patch?: { notes?: string | null; deliveryPointName?: string | null },
) {
  const now = new Date();
  const set: Record<string, unknown> = { status, updatedAt: now };
  if (status === "launched") set.launchedAt = now;
  if (status === "completed" || status === "abandoned") set.decidedAt = now;
  if (patch?.notes !== undefined) set.notes = patch.notes;
  if (patch?.deliveryPointName !== undefined) set.deliveryPointName = patch.deliveryPointName;

  const [updated] = await db
    .update(schema.checkoutSessions)
    .set(set)
    .where(eq(schema.checkoutSessions.id, sessionId))
    .returning();

  await logEvent("info", "api", `Checkout session -> ${status}`, { sessionId });
  return updated;
}
