"use client";

import { useState } from "react";
import { apiSend } from "@/lib/client";
import { CONDITIONS } from "@/lib/validation";
import { conditionLabel } from "@/lib/format";
import type { SavedSearch } from "@/app/searches/page";
import { IconX } from "./icons";

function parseArr(s: string | undefined): string {
  try {
    const v = JSON.parse(s ?? "[]");
    return Array.isArray(v) ? v.join(", ") : "";
  } catch {
    return "";
  }
}
function toArr(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
function num(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function SearchForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: SavedSearch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    keywords: initial?.keywords ?? "",
    brand: initial?.brand ?? "",
    category: initial?.category ?? "",
    size: initial?.size ?? "",
    condition: initial?.condition ?? "",
    minPrice: initial?.minPrice?.toString() ?? "",
    maxPrice: initial?.maxPrice?.toString() ?? "",
    maxTotalCost: initial?.maxTotalCost?.toString() ?? "",
    preferredBrands: parseArr(initial?.preferredBrands),
    excludedBrands: parseArr(initial?.excludedBrands),
    excludedKeywords: parseArr(initial?.excludedKeywords),
    minSellerRating: initial?.minSellerRating?.toString() ?? "",
    maxSellerRating: initial?.maxSellerRating?.toString() ?? "",
    priorityDealPct: initial?.priorityDealPct != null ? String(initial.priorityDealPct * 100) : "",
    newListingsOnly: initial?.newListingsOnly ?? true,
    alertPriceDrops: initial?.alertPriceDrops ?? false,
    notify: initial?.notify ?? true,
    active: initial?.active ?? true,
    rawParams: initial ? prettyRaw(initial.rawParams) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      let rawParams: Record<string, string> = {};
      if (f.rawParams.trim()) {
        try {
          rawParams = JSON.parse(f.rawParams);
        } catch {
          throw new Error("Advanced catalog params must be valid JSON.");
        }
      }
      const payload = {
        name: f.name,
        active: f.active,
        keywords: f.keywords || null,
        brand: f.brand || null,
        category: f.category || null,
        size: f.size || null,
        condition: f.condition || null,
        minPrice: num(f.minPrice),
        maxPrice: num(f.maxPrice),
        maxTotalCost: num(f.maxTotalCost),
        preferredBrands: toArr(f.preferredBrands),
        excludedBrands: toArr(f.excludedBrands),
        excludedKeywords: toArr(f.excludedKeywords),
        minSellerRating: num(f.minSellerRating),
        maxSellerRating: num(f.maxSellerRating),
        priorityDealPct: f.priorityDealPct.trim() ? Number(f.priorityDealPct) / 100 : null,
        newListingsOnly: f.newListingsOnly,
        alertPriceDrops: f.alertPriceDrops,
        notify: f.notify,
        rawParams,
      };
      if (initial) {
        await apiSend(`/api/searches/${initial.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/searches", "POST", payload);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="card my-8 w-full max-w-2xl p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Edit search" : "New search"}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *" className="sm:col-span-2">
            <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. North Face fleece under €40" />
          </Field>
          <Field label="Keywords">
            <input className="input" value={f.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="fleece jacket" />
          </Field>
          <Field label="Brand">
            <input className="input" value={f.brand} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Category">
            <input className="input" value={f.category} onChange={(e) => set("category", e.target.value)} />
          </Field>
          <Field label="Size">
            <input className="input" value={f.size} onChange={(e) => set("size", e.target.value)} />
          </Field>
          <Field label="Condition">
            <select className="input" value={f.condition} onChange={(e) => set("condition", e.target.value)}>
              <option value="">Any</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{conditionLabel(c)}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min price">
              <input className="input" type="number" value={f.minPrice} onChange={(e) => set("minPrice", e.target.value)} />
            </Field>
            <Field label="Max price">
              <input className="input" type="number" value={f.maxPrice} onChange={(e) => set("maxPrice", e.target.value)} />
            </Field>
          </div>
          <Field label="Max total cost (incl. fees/shipping when known)">
            <input className="input" type="number" value={f.maxTotalCost} onChange={(e) => set("maxTotalCost", e.target.value)} />
          </Field>
          <Field label="Preferred brands (comma-separated)">
            <input className="input" value={f.preferredBrands} onChange={(e) => set("preferredBrands", e.target.value)} />
          </Field>
          <Field label="Excluded brands (comma-separated)">
            <input className="input" value={f.excludedBrands} onChange={(e) => set("excludedBrands", e.target.value)} />
          </Field>
          <Field label="Excluded keywords (comma-separated)" className="sm:col-span-2">
            <input className="input" value={f.excludedKeywords} onChange={(e) => set("excludedKeywords", e.target.value)} placeholder="kids, damaged, replica" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min seller rating">
              <input className="input" type="number" step="0.1" min="0" max="5" value={f.minSellerRating} onChange={(e) => set("minSellerRating", e.target.value)} />
            </Field>
            <Field label="Max seller rating">
              <input className="input" type="number" step="0.1" min="0" max="5" value={f.maxSellerRating} onChange={(e) => set("maxSellerRating", e.target.value)} />
            </Field>
          </div>
          <Field label="Priority deal threshold (% under ceiling)">
            <input className="input" type="number" value={f.priorityDealPct} onChange={(e) => set("priorityDealPct", e.target.value)} placeholder="e.g. 30" />
          </Field>
          <Field label="Advanced: Vinted catalog params (JSON)" className="sm:col-span-2">
            <textarea className="input font-mono text-xs" rows={2} value={f.rawParams} onChange={(e) => set("rawParams", e.target.value)} placeholder='{"catalog_ids":"79","brand_ids":"53"}' />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Toggle label="Active" checked={f.active} onChange={(v) => set("active", v)} />
          <Toggle label="New listings only" checked={f.newListingsOnly} onChange={(v) => set("newListingsOnly", v)} />
          <Toggle label="Alert on price drops" checked={f.alertPriceDrops} onChange={(v) => set("alertPriceDrops", v)} />
          <Toggle label="Send notifications" checked={f.notify} onChange={(v) => set("notify", v)} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy || !f.name.trim()}>
            {busy ? "Saving…" : "Save search"}
          </button>
        </div>
      </div>
    </div>
  );
}

function prettyRaw(s: string): string {
  try {
    const v = JSON.parse(s);
    return Object.keys(v).length ? JSON.stringify(v) : "";
  } catch {
    return "";
  }
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
