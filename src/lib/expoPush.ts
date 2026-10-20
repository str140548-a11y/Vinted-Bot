import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { logEvent } from "./logger";

/**
 * Expo Push delivery for the Android app.
 *
 * The React Native app registers an Expo push token (via /api/push/expo). When
 * a match is found, the backend sends a push through Expo's hosted Push API,
 * which relays to FCM on the device. This requires NO Google/FCM credentials
 * for Expo-managed builds — Expo handles the FCM relay for you. (For a bare/
 * production standalone build you add your own FCM key in the Expo dashboard;
 * see README.)
 *
 * Tapping the notification opens the matching listing — the app reads the
 * `url` from the push `data` payload and routes to it.
 */

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: "default" | null;
  priority?: "default" | "high";
  channelId?: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send a push to every registered Expo token. Prunes tokens that Expo reports
 * as unregistered (DeviceNotRegistered). Never throws — logs and continues.
 */
export async function sendExpoPush(opts: {
  title: string;
  body: string;
  url?: string | null;
  listingId?: string | null;
  priority?: boolean;
  sound?: boolean;
}): Promise<{ sent: number; pruned: number }> {
  const tokens = await db.select().from(schema.expoPushTokens);
  if (tokens.length === 0) return { sent: 0, pruned: 0 };

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title: opts.title,
    body: opts.body,
    sound: opts.sound === false ? null : "default",
    priority: opts.priority ? "high" : "default",
    channelId: opts.priority ? "priority" : "matches",
    data: { url: opts.url ?? null, listingId: opts.listingId ?? null },
  }));

  let sent = 0;
  let pruned = 0;

  // Expo accepts batches of up to 100 messages.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        await logEvent("warn", "notify", "Expo push HTTP error", { status: res.status });
        continue;
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = json.data ?? [];
      const toPrune: string[] = [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "ok") {
          sent++;
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          toPrune.push(batch[idx].to);
        } else {
          logEvent("warn", "notify", "Expo push ticket error", {
            error: ticket.details?.error ?? ticket.message,
          });
        }
      });
      if (toPrune.length) {
        await db
          .delete(schema.expoPushTokens)
          .where(inArray(schema.expoPushTokens.token, toPrune))
          .catch(() => {});
        pruned += toPrune.length;
      }
    } catch (err) {
      await logEvent("warn", "notify", "Expo push send failed", { err: String(err) });
    }
  }

  return { sent, pruned };
}

/** Register or refresh an Expo push token. */
export async function registerExpoToken(
  token: string,
  platform: string,
  deviceName?: string | null,
): Promise<void> {
  await db
    .insert(schema.expoPushTokens)
    .values({ token, platform, deviceName: deviceName ?? null })
    .onConflictDoUpdate({
      target: schema.expoPushTokens.token,
      set: { platform, deviceName: deviceName ?? null },
    });
}

/** Remove a token (e.g. on logout / disable). */
export async function removeExpoToken(token: string): Promise<void> {
  await db.delete(schema.expoPushTokens).where(eq(schema.expoPushTokens.token, token));
}
