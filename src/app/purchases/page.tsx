"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { money, relativeTime } from "@/lib/format";
import type { ListingLike } from "@/components/ListingCard";
import { IconExternal } from "@/components/icons";

interface PurchaseRow {
  id: string;
  listingId: string;
  recordedPrice: number;
  recordedFees: number | null;
  recordedTotal: number | null;
  deliveryPointName: string | null;
  status: "intended" | "confirmed" | "abandoned";
  createdAt: string;
  listing: ListingLike;
}

export default function PurchasesPage() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(await apiGet<PurchaseRow[]>("/api/purchases"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (p: PurchaseRow, status: PurchaseRow["status"]) => {
    await apiSend("/api/purchases", "POST", { listingId: p.listingId, status });
    await load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Purchase History</h1>
        <p className="text-sm text-slate-500">
          Items you chose to buy. Status reflects <strong>your</strong> confirmation — this app
          can&apos;t read Vinted order state, so nothing is marked complete automatically.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          No purchases recorded yet. When you confirm a buy from the Review Queue, it&apos;s logged here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                <th className="py-2 pr-3">Item</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Fees</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Pickup</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/60">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      {p.listing.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.listing.imageUrl} alt="" referrerPolicy="no-referrer" className="h-10 w-9 rounded object-cover" />
                      )}
                      <a href={p.listing.url} target="_blank" rel="noopener noreferrer" className="line-clamp-1 max-w-[180px] hover:underline">
                        {p.listing.title}
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2">{money(p.recordedPrice, p.listing.currency)}</td>
                  <td className="px-3 py-2">{p.recordedFees != null ? money(p.recordedFees, p.listing.currency) : "—"}</td>
                  <td className="px-3 py-2 font-medium">{p.recordedTotal != null ? money(p.recordedTotal, p.listing.currency) : "—"}</td>
                  <td className="px-3 py-2">{p.deliveryPointName ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{relativeTime(p.createdAt)}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {p.status !== "confirmed" && (
                        <button className="btn-ghost text-xs" onClick={() => setStatus(p, "confirmed")}>
                          Mark bought
                        </button>
                      )}
                      {p.status !== "abandoned" && (
                        <button className="btn-ghost text-xs" onClick={() => setStatus(p, "abandoned")}>
                          Abandon
                        </button>
                      )}
                      <a href={p.listing.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                        <IconExternal width={14} height={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    intended: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    confirmed: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300",
    abandoned: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  const label = status === "intended" ? "Intended" : status === "confirmed" ? "Confirmed" : "Abandoned";
  return <span className={`badge ${map[status]}`}>{label}</span>;
}
