import { env } from "../env";
import { HttpVintedAdapter } from "./httpAdapter";
import { MockVintedAdapter } from "./mockAdapter";
import type { VintedAdapter } from "./types";

export * from "./types";

/**
 * Resolve the active adapter. Preference order:
 *   1. Explicit `override` (used by the engine, which reads the DB Settings row).
 *   2. VINTED_ADAPTER env var.
 * Defaults to the safe, clearly-labeled mock adapter.
 */
export function getAdapter(override?: "mock" | "http"): VintedAdapter {
  const choice = override ?? env.vintedAdapter;
  if (choice === "http") return new HttpVintedAdapter();
  return new MockVintedAdapter();
}
