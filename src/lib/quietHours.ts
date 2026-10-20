/**
 * Pure quiet-hours logic. Given "HH:MM" start/end and a Date, return whether we
 * are currently within quiet hours. Handles ranges that wrap midnight
 * (e.g. 22:00 -> 08:00). Priority alerts bypass quiet hours (handled by caller).
 */
export function parseHm(hm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function isWithinQuietHours(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!start || !end) return false;
  const s = parseHm(start);
  const e = parseHm(end);
  if (s == null || e == null) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (s === e) return false; // zero-length window
  if (s < e) {
    // Same-day window.
    return cur >= s && cur < e;
  }
  // Wraps midnight.
  return cur >= s || cur < e;
}
