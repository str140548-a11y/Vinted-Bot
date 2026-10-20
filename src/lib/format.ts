export function money(amount: number | null | undefined, currency = "EUR"): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function relativeTime(date: Date | string | number | null | undefined): string {
  if (date == null) return "never";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export const CONDITION_LABELS: Record<string, string> = {
  new_with_tags: "New with tags",
  new_without_tags: "New w/o tags",
  very_good: "Very good",
  good: "Good",
  satisfactory: "Satisfactory",
};

export function conditionLabel(c: string | null | undefined): string {
  if (!c) return "—";
  return CONDITION_LABELS[c] ?? c;
}
