"use client";

import { useEffect, useState } from "react";
import { mmss } from "@/lib/format";

/**
 * Local countdown display. Honest: it's a review timer, not a reservation.
 * Returns seconds remaining via onExpire when it hits zero.
 */
export function Countdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string | number | Date;
  onExpire?: () => void;
}) {
  const target = new Date(expiresAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, Math.round((target - now) / 1000));

  useEffect(() => {
    if (remaining === 0) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining === 0]);

  const danger = remaining <= 60;
  const warn = remaining <= 300 && remaining > 60;

  return (
    <span
      className={`font-mono text-lg font-bold tabular-nums ${
        danger
          ? "text-red-500"
          : warn
            ? "text-amber-500"
            : "text-brand-600 dark:text-brand-400"
      }`}
    >
      {mmss(remaining)}
    </span>
  );
}
