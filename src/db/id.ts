import { randomBytes } from "node:crypto";

/**
 * Compact, collision-resistant, URL-safe id generator (cuid-like). Avoids an
 * extra dependency. 24 chars of base36 time + randomness.
 */
export function createId(): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(10).toString("hex").slice(0, 16);
  return `c${time}${rand}`;
}
