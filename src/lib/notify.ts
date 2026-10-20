import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env, webPushConfigured } from "./env";
import { logEvent } from "./logger";
import { isWithinQuietHours } from "./quietHours";
import { getSettings } from "./settings";
import { sendExpoPush } from "./expoPush";

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (!webPushConfigured()) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    vapidConfigured = true;
  }
  return true;
}

export interface NotifyPayload {
  title: string;
  body: string;
  priority?: boolean;
  listingId?: string | null;
  savedSearchId?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}

/**
 * Central notification dispatcher. Honors quiet hours (priority alerts bypass
 * them), records every notification to the DB, and fans out to enabled
 * channels: in-app (always), web push, and Telegram (modular).
 */
export async function dispatchNotification(payload: NotifyPayload): Promise<void> {
  const settings = await getSettings();

  const quiet =
    !payload.priority &&
    isWithinQuietHours(settings.quietHoursStart, settings.quietHoursEnd);

  const [record] = await db
    .insert(schema.notifications)
    .values({
      title: payload.title,
      body: payload.body,
      priority: payload.priority ?? false,
      channel: "in_app",
      status: quiet ? "suppressed_quiet_hours" : "sent",
      listingId: payload.listingId ?? null,
      savedSearchId: payload.savedSearchId ?? null,
    })
    .returning();

  if (quiet) {
    await logEvent("info", "notify", "Notification suppressed (quiet hours)", {
      title: payload.title,
    });
    return;
  }

  if (settings.webPushEnabled && ensureVapid()) {
    await sendWebPush(payload);
  }

  // Android app push (Expo). Always attempted when tokens exist; honors the
  // notification-sound setting and the priority flag.
  await sendExpoPush({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    listingId: payload.listingId,
    priority: payload.priority,
    sound: settings.notificationSound,
  });

  if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
    await sendTelegram(settings.telegramBotToken, settings.telegramChatId, payload);
  }

  await logEvent("info", "notify", "Notification dispatched", {
    id: record.id,
    priority: payload.priority ?? false,
  });
}

async function sendWebPush(payload: NotifyPayload): Promise<void> {
  const subs = await db.select().from(schema.pushSubscriptions);
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    imageUrl: payload.imageUrl,
    priority: payload.priority ?? false,
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.id, sub.id))
            .catch(() => {});
        } else {
          await logEvent("warn", "notify", "Web push send failed", {
            endpoint: sub.endpoint.slice(0, 40),
            statusCode,
          });
        }
      }
    }),
  );
}

async function sendTelegram(
  token: string,
  chatId: string,
  payload: NotifyPayload,
): Promise<void> {
  try {
    const text = `*${escapeMd(payload.title)}*\n${escapeMd(payload.body)}${
      payload.url ? `\n[Open listing](${payload.url})` : ""
    }`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: false,
      }),
    });
    if (!res.ok) {
      await db.insert(schema.notifications).values({
        title: payload.title,
        body: payload.body,
        channel: "telegram",
        status: "failed",
        error: `HTTP ${res.status}`,
        listingId: payload.listingId ?? null,
      });
    }
  } catch (err) {
    await logEvent("warn", "notify", "Telegram send failed", { err: String(err) });
  }
}

function escapeMd(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}
