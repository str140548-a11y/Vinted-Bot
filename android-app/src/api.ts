import { API_BASE_URL } from "./config";

/** The backend envelope: { ok, data } on success, { ok:false, error } on failure. */
export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Pure: turn a parsed envelope + HTTP status into either data or a thrown
 * ApiError. Extracted so it can be unit-tested without the network.
 */
export function unwrap<T>(env: ApiEnvelope<T>, status = 200): T {
  if (!env || typeof env !== "object") {
    throw new ApiError("Malformed response from server", status);
  }
  if (!env.ok) {
    const detail = formatDetails(env.details);
    throw new ApiError(`${env.error ?? "Request failed"}${detail}`, status);
  }
  return env.data as T;
}

function formatDetails(details: unknown): string {
  const fieldErrors = (details as { fieldErrors?: Record<string, string[]> })?.fieldErrors;
  if (!fieldErrors) return "";
  const parts = Object.entries(fieldErrors)
    .map(([k, v]) => `${k}: ${v.join(", ")}`)
    .filter(Boolean);
  return parts.length ? ` (${parts.join("; ")})` : "";
}

async function request<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      throw new ApiError("Request timed out. Is the backend reachable?");
    }
    throw new ApiError(
      `Network error contacting backend at ${API_BASE_URL}. Check the URL and that the server is running.`,
    );
  }
  clearTimeout(timeout);

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(`Server returned non-JSON (HTTP ${res.status})`, res.status);
  }
  return unwrap(json, res.status);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
