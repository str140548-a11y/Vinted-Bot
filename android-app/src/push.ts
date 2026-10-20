import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";
import { EAS_PROJECT_ID } from "./config";

/**
 * Push notifications for Android via Expo.
 *
 * Flow:
 *   1. Ask the OS for POST_NOTIFICATIONS permission (Android 13+).
 *   2. Get an Expo push token (needs a dev/preview/production build — NOT Expo
 *      Go for SDK 53+, but fine on a dev client / standalone APK).
 *   3. Register the token with the backend, which sends pushes via Expo when a
 *      match is found.
 *   4. Create Android notification channels (sound/importance).
 *
 * HONESTY: push delivery depends on the BACKEND/worker running (see README).
 * The phone does not poll Vinted itself; a continuously running Android
 * background task is NOT guaranteed by the OS, so monitoring lives server-side.
 */

export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("matches", {
    name: "Listing matches",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync("priority", {
    name: "Priority deals",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

export interface RegisterResult {
  ok: boolean;
  token?: string;
  reason?: string;
}

export async function registerForPush(): Promise<RegisterResult> {
  if (!Device.isDevice) {
    return { ok: false, reason: "Push requires a physical device (not an emulator)." };
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    return { ok: false, reason: "Notification permission not granted." };
  }

  await ensureAndroidChannels();

  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    );
    token = res.data;
  } catch (err) {
    return {
      ok: false,
      reason: `Could not obtain Expo push token: ${(err as Error).message}. Build a dev/preview APK (not Expo Go) and set the EAS projectId.`,
    };
  }

  try {
    await api.post("/api/push/expo", {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? null,
    });
  } catch (err) {
    return { ok: false, token, reason: `Registered token but backend rejected it: ${(err as Error).message}` };
  }

  return { ok: true, token };
}

export async function unregisterPush(token: string): Promise<void> {
  await api.del(`/api/push/expo?token=${encodeURIComponent(token)}`).catch(() => {});
}

/** Extract a listing URL from a received/ tapped notification payload. */
export function urlFromNotification(
  notification: Notifications.Notification | Notifications.NotificationResponse,
): string | null {
  const content =
    "request" in notification
      ? notification.request.content
      : (notification as Notifications.NotificationResponse).notification.request.content;
  const data = content?.data as { url?: string } | undefined;
  return data?.url ?? null;
}
