import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api";
import { transitionCheckout } from "@/lib/checkout";

export const dynamic = "force-dynamic";

const patchInput = z.object({
  status: z.enum(["inspecting", "launched", "completed", "abandoned"]),
  notes: z.string().max(500).optional().nullable(),
  deliveryPointName: z.string().max(200).optional().nullable(),
});

/**
 * Transition a checkout session. All transitions are explicit USER actions:
 *   launched   -> user opened the real Vinted listing to buy there
 *   completed  -> user reports they finished the purchase on Vinted
 *   abandoned  -> user decided not to buy
 * The app never infers these from Vinted and never fakes a purchase.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const input = patchInput.parse(await req.json());
    return transitionCheckout(params.id, input.status, {
      notes: input.notes,
      deliveryPointName: input.deliveryPointName,
    });
  });
}
