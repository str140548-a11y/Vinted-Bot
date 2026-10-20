"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { relativeTime } from "@/lib/format";
import { SearchForm } from "@/components/SearchForm";
import {
  IconCopy,
  IconPause,
  IconPlay,
  IconPlus,
  IconTrash,
} from "@/components/icons";

export interface SavedSearch {
  id: string;
  name: string;
  active: boolean;
  keywords: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  maxTotalCost: number | null;
  preferredBrands: string;
  excludedBrands: string;
  excludedKeywords: string;
  minSellerRating: number | null;
  maxSellerRating: number | null;
  newListingsOnly: boolean;
  alertPriceDrops: boolean;
  notify: boolean;
  priorityDealPct: number | null;
  rawParams: string;
  lastCheckedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
}

export default function SearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setSearches(await apiGet<SavedSearch[]>("/api/searches"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (s: SavedSearch) => {
    await apiSend(`/api/searches/${s.id}`, "PATCH", { active: !s.active });
    await load();
  };
  const duplicate = async (s: SavedSearch) => {
    await apiSend(`/api/searches/${s.id}/duplicate`, "POST");
    await load();
  };
  const remove = async (s: SavedSearch) => {
    if (!confirm(`Delete "${s.name}"? This also removes its detected listings.`)) return;
    await apiSend(`/api/searches/${s.id}`, "DELETE");
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Saved Searches</h1>
          <p className="text-sm text-slate-500">Each active search is polled by the monitor</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <IconPlus width={16} height={16} /> New search
        </button>
      </div>

      {searches.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          No saved searches yet. Create one to start monitoring.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {searches.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{s.name}</h3>
                    <span
                      className={`badge ${
                        s.active
                          ? "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {s.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {[s.keywords, s.brand, s.size && `size ${s.size}`, s.maxPrice && `≤ ${s.maxPrice}`]
                      .filter(Boolean)
                      .join(" · ") || "no filters"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Last check: {relativeTime(s.lastCheckedAt)}{" "}
                  {s.lastStatus && (
                    <span
                      className={
                        s.lastStatus === "ok"
                          ? "text-brand-600"
                          : s.lastStatus === "rate_limited"
                            ? "text-amber-500"
                            : "text-red-500"
                      }
                    >
                      ({s.lastStatus})
                    </span>
                  )}
                </span>
              </div>
              {s.lastError && <p className="mt-1 text-xs text-red-500">{s.lastError}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => setEditing(s)}>
                  Edit
                </button>
                <button className="btn-secondary" onClick={() => toggle(s)}>
                  {s.active ? <IconPause width={16} height={16} /> : <IconPlay width={16} height={16} />}
                  {s.active ? "Pause" : "Resume"}
                </button>
                <button className="btn-secondary" onClick={() => duplicate(s)}>
                  <IconCopy width={16} height={16} /> Duplicate
                </button>
                <button className="btn-danger" onClick={() => remove(s)}>
                  <IconTrash width={16} height={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SearchForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
