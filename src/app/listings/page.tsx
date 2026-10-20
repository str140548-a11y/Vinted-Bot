"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { ListingCard, type ListingLike } from "@/components/ListingCard";
import { ReviewButton } from "@/components/ReviewButton";

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingLike[]>([]);
  const [filter, setFilter] = useState<"all" | "available" | "today">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const qs =
      filter === "available" ? "?availability=available" : filter === "today" ? "?today=1" : "";
    try {
      setListings(await apiGet<ListingLike[]>(`/api/listings${qs}`));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Live Listings</h1>
          <p className="text-sm text-slate-500">Items detected by your active searches</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
          {(["all", "available", "today"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-sm capitalize ${
                filter === f
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : listings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              footer={<ReviewButton listingId={l.id} onChanged={load} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-medium">No listings yet</p>
      <p className="max-w-md text-sm text-slate-500">
        Run a monitor check from the Overview page (or start the worker). With the mock adapter,
        new demo items appear every few checks so you can see the full flow offline.
      </p>
    </div>
  );
}
