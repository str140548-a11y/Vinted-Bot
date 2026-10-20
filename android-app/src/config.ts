import Constants from "expo-constants";

/**
 * Resolve the backend API base URL.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_BASE_URL env (set at build time via EAS secrets or .env)
 *   2. `extra.apiBaseUrl` in app.json
 *   3. Android emulator default (10.0.2.2 maps to the host machine's localhost)
 *
 * IMPORTANT: for a real phone you MUST point this at a reachable backend
 * (a deployed URL, or your computer's LAN IP while developing). `localhost`
 * on the device refers to the phone itself, not your dev machine.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.length > 0) return stripTrailingSlash(fromEnv);

  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl;
  if (fromExtra && fromExtra.length > 0) return stripTrailingSlash(fromExtra);

  return "http://10.0.2.2:3000";
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveBaseUrl();

/** The Expo projectId used for push tokens (from app.json). */
export const EAS_PROJECT_ID =
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
    ?.projectId ?? undefined;
