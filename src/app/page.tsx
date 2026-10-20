"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client";
import { relativeTime } from "@/lib/format";
import { IconRefresh } from "@/components/icons";

interface Health {
  overview: {
    activeSearches: number;
    detectedToday: number;
    availableMatches: number;
    notificationsToday: number;
    underReview: number;
    confirmedPurchases: number;
  };
  health: {
    running: boolean;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    consecutiveErrors: number;
    totalChecks: number;
    totalMatches: number;
    adapterSource: string;
    adapterLabel: string;
  };
  settings: { reviewWindowSec: number; quickBuyEnabled: boolean; pollIntervalSec: number };
}

const cards: { key: keyof Health["overview"]; label: string; href?: string }[] = [
  { key: "activeSearches", label: "Active searches", href: "/searches" },
  { key: "detectedToday", label: "Detected today", href: "/listings" },
  { key: "availableMatches", label: "Available matches", href: "/listings" },
  { key: "notificationsToday", label: "Notifications today", href: "/notifications" },
  { key: "underReview", label: "Under review", href: "/reviews" },
  { key: "confirmedPurchases", label: "Confirmed purchases", href: "/purchases" },
];

export default function OverviewPage() {
  const [data, setData] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiGet<Health>("/api/health"));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const checkNow = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiSend<{ searches: number; results: { newMatches: number }[] }>(
        "/api/monitor",
        "POST",
      );
      const matched = r.results.reduce((a, x) => a + x.newMatches, 0);
      setMsg(`Checked ${r.searches} search(es) · ${matched} new match(es)`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-slate-500">Your monitoring at a glance</p>
        </div>
        <button className="btn-primary" onClick={checkNow} disabled={busy}>
          <IconRefresh width={16} height={16} /> {busy ? "Checking…" : "Check now"}
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Link key={c.key} href={c.href ?? "#"} className="card p-4 transition-shadow hover:shadow-md">
            <div className="text-2xl font-bold">{data ? data.overview[c.key] : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Monitoring status</h2>
          {data ? (
            <dl className="space-y-2 text-sm">
              <Row label="Data source">
                <span
                  className={`badge ${
                    data.health.adapterSource === "mock"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300"
                  }`}
                >
                  {data.health.adapterSource === "mock" ? "Mock (demo)" : "Live polling"}
                </span>
                <span className="ml-2 text-xs text-slate-500">{data.health.adapterLabel}</span>
              </Row>
              <Row label="Last check">{relativeTime(data.health.lastRunAt)}</Row>
              <Row label="Last success">{relativeTime(data.health.lastSuccessAt)}</Row>
              <Row label="Total checks">{data.health.totalChecks}</Row>
              <Row label="Total matches">{data.health.totalMatches}</Row>
              <Row label="Consecutive errors">
                <span className={data.health.consecutiveErrors > 0 ? "text-red-500" : ""}>
                  {data.health.consecutiveErrors}
                </span>
              </Row>
              {data.health.lastError && (
                <Row label="Last error">
                  <span className="text-red-500">{data.health.lastError}</span>
                </Row>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">How monitoring works here</h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>
              • Vinted has <strong>no official public API</strong>. The live adapter polls Vinted&apos;s
              internal catalog endpoint — unofficial and subject to their Terms.
            </li>
            <li>
              • Latency is bounded by poll cadence
              {data ? ` (~${data.settings.pollIntervalSec}s)` : ""}, not true real-time push.
            </li>
            <li>
              • The <strong>Review Window</strong> is a local timer. It does <strong>not</strong> reserve
              or hold the item on Vinted.
            </li>
            <li>
              • Quick Buy / purchase is{" "}
              {data?.settings.quickBuyEnabled ? "enabled" : "disabled"} — it only opens the real listing;
              it never buys automatically.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
