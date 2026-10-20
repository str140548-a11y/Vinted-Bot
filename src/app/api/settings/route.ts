import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { settingsInput } from "@/lib/validation";
import { env, webPushConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const settings = await getSettings();
    // Expose capability flags (never secrets) so the UI can show honest status.
    return {
      ...settings,
      // Mask the telegram token.
      telegramBotToken: settings.telegramBotToken ? "••••••••" : null,
      _capabilities: {
        webPushConfigured: webPushConfigured(),
        vapidPublicKey: env.vapidPublicKey || null,
        adapterEnv: env.vintedAdapter,
        vintedBaseUrl: env.vintedBaseUrl,
        cookieConfigured: Boolean(env.vintedCookie),
      },
    };
  });
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const input = settingsInput.parse(await req.json());
    await getSettings(); // ensure row exists
    const [updated] = await db
      .update(schema.settings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.settings.id, "singleton"))
      .returning();
    return { ...updated, telegramBotToken: updated.telegramBotToken ? "••••••••" : null };
  });
}
