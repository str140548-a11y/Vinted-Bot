import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";
import { env } from "@/lib/env";
import { pushSubscriptionInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Return the VAPID public key so the client can subscribe. */
export async function GET() {
  return handle(async () => ({
    vapidPublicKey: env.vapidPublicKey || null,
    configured: Boolean(env.vapidPublicKey && env.vapidPrivateKey),
  }));
}

/** Store (or refresh) a browser push subscription. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const input = pushSubscriptionInput.parse(await req.json());
    await db
      .insert(schema.pushSubscriptions)
      .values({
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: schema.pushSubscriptions.endpoint,
        set: { p256dh: input.keys.p256dh, auth: input.keys.auth },
      });
    return { subscribed: true };
  });
}
