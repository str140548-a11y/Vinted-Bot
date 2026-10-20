"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { conditionLabel, money, relativeTime } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { AvailabilityBadge, type ListingLike } from "@/components/ListingCard";
import { BuyDialog } from "@/components/BuyDialog";
import { IconClock, IconExternal, IconWarn, IconX } from "@/components/icons";

interface CheckoutRow {
  id: string;
  status: "inspecting" | "launched" | "completed" | "abandoned";
  priceAtStart: number;
  totalAtStart: number | null;
  deliveryPointName: string | null;
  inspectionStartedAt: string | null;
  inspectionDurationSec: number | null;
  launchedAt: string | null;
  createdAt: string;
  listing: ListingLike;
}

/** Advisory warnings shown while inspecting. Never blocking. */
function warnings(l: ListingLike, priceAtStart: number): string[] {
  const w: string[] = [];
  if (!l.imageUrl) w.push("No product image available.");
  if (!l.condition) w.push("Condition not specified.");
  if (l.sellerRating != null && l.sellerRating < 3.5)
    w.push(`Low seller rating (${l.sellerRating.toFixed(1)}).`);
  if (l.price < priceAtStart * 0.6)
    w.push("Price dropped sharply since first seen — verify it's genuine.");
  if (l.price <= 2) w.push("Unusually low price — double-check for scams.");
  return w;
}

export default function CheckoutQueuePage() {
  const [rows, setRows] = useState<CheckoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyTarget, setBuyTarget] = useState<ListingLike | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const load = useCallback(async () => {
    try {
      setRows(await apiGet<CheckoutRow[]>("/api/checkout"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const report = async (id: string, status: "completed" | "abandoned", listingId: string) => {
    await apiSend(`/api/checkout/${id}`, "PATCH", { status });
    await apiSend("/api/purchases", "POST", {
      listingId,
      status: status === "completed" ? "confirmed" : "abandoned",
    });
    await load();
  };

  const active = rows.filter((r) => r.status === "inspecting" || r.status === "launched");
  const history = rows.filter((r) => r.status === "completed" || r.status === "abandoned");
  const list = tab === "active" ? active : history;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Checkout Queue</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Assisted checkout. This app can&apos;t reserve items or open Vinted&apos;s checkout for you —
            any temporary hold is created <strong>by Vinted</strong> when you tap Buy now there. Inspect,
            then launch to the real listing.
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
          {tab === "active"
            ? "No active checkouts. Start one from a listing's Checkout button in Live Listings."
            : "No checkout history yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const warns = warnings(r.listing, r.priceAtStart);
            const inspectionExpiresAt =
              r.inspectionStartedAt && r.inspectionDurationSec
                ? new Date(new Date(r.inspectionStartedAt).getTime() + r.inspectionDurationSec * 1000)
                : null;
            return (
              <div key={r.id} id={r.listing.id} className="card flex flex-col gap-4 p-4 md:flex-row">
                <div className="h-40 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {r.listing.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.listing.imageUrl} alt={r.listing.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{r.listing.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <AvailabilityBadge availability={r.listing.availability} />
                        <StatusBadge status={r.status} />
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
                        <div className="text-xs text-slate-500">~{money(r.listing.totalCost, r.listing.currency)} total</div>
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

                  {inspectionExpiresAt && r.status === "inspecting" && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <IconClock width={14} height={14} />
                      Your inspection timer (local only — Vinted has NOT reserved this):{" "}
                      <Countdown expiresAt={inspectionExpiresAt} />
                    </div>
                  )}

                  {r.status === "inspecting" || r.status === "launched" ? (
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <button className="btn-primary" onClick={() => setBuyTarget(r.listing)}>
                        <IconExternal width={16} height={16} />
                        {r.status === "launched" ? "Reopen checkout" : "Checkout on Vinted"}
                      </button>
                      <a href={r.listing.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                        <IconExternal width={16} height={16} /> Inspect listing
                      </a>
                      {r.status === "launched" && (
                        <button className="btn-secondary" onClick={() => report(r.id, "completed", r.listing.id)}>
                          I bought it
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => report(r.id, "abandoned", r.listing.id)}>
                        <IconX width={16} height={16} /> Abandon
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <a href={r.listing.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
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
          listing={buyTarget}
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
    inspecting: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    launched: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    completed: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300",
    abandoned: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  const label =
    status === "inspecting" ? "Inspecting"
    : status === "launched" ? "Opened on Vinted"
    : status === "completed" ? "Bought"
    : "Abandoned";
  return <span className={`badge ${map[status]}`}>{label}</span>;
}
