"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { conditionLabel, money, relativeTime } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { AvailabilityBadge, type ListingLike } from "@/components/ListingCard";
import { BuyDialog } from "@/components/BuyDialog";
import { IconCheck, IconClock, IconExternal, IconWarn, IconX } from "@/components/icons";

interface ReviewRow {
  id: string;
  status: "reviewing" | "approved" | "rejected" | "expired";
  priceAtStart: number;
  startedAt: string;
  expiresAt: string;
  durationSec: number;
  listing: ListingLike;
}

/** Heuristic warnings shown during review. All are advisory, never blocking. */
function warnings(r: ReviewRow): string[] {
  const w: string[] = [];
  const l = r.listing;
  if (!l.imageUrl) w.push("No product image available.");
  if (!l.condition) w.push("Condition not specified.");
  if (l.sellerRating != null && l.sellerRating < 3.5)
    w.push(`Low seller rating (${l.sellerRating.toFixed(1)}).`);
  // Suspiciously low price vs. the price when first seen (any drop >40%).
  if (l.price < r.priceAtStart * 0.6)
    w.push("Price dropped sharply since first seen — verify it's genuine.");
  if (l.price <= 2) w.push("Unusually low price — double-check for scams.");
  return w;
}

export default function ReviewsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyTarget, setBuyTarget] = useState<ReviewRow | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const load = useCallback(async () => {
    try {
      setRows(await apiGet<ReviewRow[]>("/api/reviews"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const decide = async (id: string, decision: "approved" | "rejected" | "reviewing") => {
    await apiSend(`/api/reviews/${id}`, "PATCH", { decision });
    await load();
  };

  const active = rows.filter((r) => r.status === "reviewing");
  const history = rows.filter((r) => r.status !== "reviewing");
  const list = tab === "active" ? active : history;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Review Queue</h1>
          <p className="text-sm text-slate-500">
            A local 15-minute timer to inspect before you buy. This does <strong>not</strong> reserve
            the item on Vinted.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
          {(["active", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-sm capitalize ${
                tab === t
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t} ({t === "active" ? active.length : history.length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          {tab === "active" ? "No items under review right now." : "No review history yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const warns = warnings(r);
            return (
              <div key={r.id} id={r.listing.id} className="card flex flex-col gap-4 p-4 md:flex-row">
                <div className="h-40 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {r.listing.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.listing.imageUrl}
                      alt={r.listing.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{r.listing.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <AvailabilityBadge availability={r.listing.availability} />
                        {r.listing.brand && <span>{r.listing.brand}</span>}
                        {r.listing.size && <span>· Size {r.listing.size}</span>}
                        <span>· {conditionLabel(r.listing.condition)}</span>
                        <span>· {relativeTime(r.listing.firstSeenAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-brand-700 dark:text-brand-400">
                        {money(r.listing.price, r.listing.currency)}
                      </div>
                      {r.listing.totalCost != null && (
                        <div className="text-xs text-slate-500">
                          ~{money(r.listing.totalCost, r.listing.currency)} total
                        </div>
                      )}
                    </div>
                  </div>

                  {warns.length > 0 && (
                    <ul className="space-y-1 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {warns.map((w, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <IconWarn width={14} height={14} /> {w}
                        </li>
                      ))}
                    </ul>
                  )}

                  {r.status === "reviewing" ? (
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                        <IconClock width={16} height={16} />
                        <Countdown expiresAt={r.expiresAt} onExpire={load} />
                      </div>
                      <button className="btn-primary" onClick={() => setBuyTarget(r)}>
                        <IconCheck width={16} height={16} /> Buy now
                      </button>
                      <a
                        href={r.listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                      >
                        <IconExternal width={16} height={16} /> Keep reviewing
                      </a>
                      <button className="btn-danger" onClick={() => decide(r.id, "rejected")}>
                        <IconX width={16} height={16} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <StatusBadge status={r.status} />
                      <a
                        href={r.listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                      >
                        <IconExternal width={16} height={16} /> Reopen listing
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {buyTarget && (
        <BuyDialog
          review={buyTarget}
          onClose={() => setBuyTarget(null)}
          onDone={async () => {
            setBuyTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    expired: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  const label =
    status === "approved" ? "Approved (sent to Vinted)" : status === "rejected" ? "Rejected" : "Expired";
  return <span className={`badge ${map[status]}`}>{label}</span>;
}
