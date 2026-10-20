import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api";
import { registerExpoToken, removeExpoToken } from "@/lib/expoPush";

export const dynamic = "force-dynamic";

const registerInput = z.object({
  token: z.string().min(1).max(300),
  platform: z.enum(["android", "ios"]).default("android"),
  deviceName: z.string().max(120).optional().nullable(),
});

/** Register (or refresh) an Expo push token from the Android app. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const input = registerInput.parse(await req.json());
    await registerExpoToken(input.token, input.platform, input.deviceName);
    return { registered: true };
  });
}

/** Unregister a token (e.g. when the user disables push). */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const token = new URL(req.url).searchParams.get("token");
    if (token) await removeExpoToken(token);
    return { removed: true };
  });
}
