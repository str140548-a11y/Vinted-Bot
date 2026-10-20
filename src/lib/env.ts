/**
 * Centralized environment access with sane defaults. No secrets are hardcoded.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:you@example.com",
  vintedAdapter: (process.env.VINTED_ADAPTER ?? "mock") as "mock" | "http",
  vintedBaseUrl: process.env.VINTED_BASE_URL ?? "https://www.vinted.com",
  vintedUserAgent:
    process.env.VINTED_USER_AGENT ??
    "Mozilla/5.0 (compatible; VintedAssistant/1.0; personal use)",
  vintedCookie: process.env.VINTED_COOKIE ?? "",
  monitorPollIntervalSec: Math.max(
    30,
    Number(process.env.MONITOR_POLL_INTERVAL_SEC ?? "60") || 60,
  ),
  workerSecret: process.env.WORKER_SECRET ?? "change-me",
  nodeEnv: process.env.NODE_ENV ?? "development",
};

export function webPushConfigured(): boolean {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
}
