"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { IconMap, IconPlus, IconTrash } from "./icons";

interface Pickup {
  id: string;
  name: string;
  provider: string | null;
  address: string | null;
  postcode: string | null;
  distanceKm: number | null;
  priority: number;
  enabled: boolean;
  isPrimary: boolean;
}

export function DeliveryPrefs() {
  const [rows, setRows] = useState<Pickup[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "", address: "", postcode: "", distanceKm: "" });

  const load = useCallback(async () => {
    setRows(await apiGet<Pickup[]>("/api/pickup-locations"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!form.name.trim()) return;
    await apiSend("/api/pickup-locations", "POST", {
      name: form.name,
      provider: form.provider || null,
      address: form.address || null,
      postcode: form.postcode || null,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
      priority: rows.length,
      isPrimary: rows.length === 0,
    });
    setForm({ name: "", provider: "", address: "", postcode: "", distanceKm: "" });
    setAdding(false);
    await load();
  };

  const setPrimary = async (p: Pickup) => {
    await apiSend(`/api/pickup-locations/${p.id}`, "PATCH", { isPrimary: true });
    await load();
  };
  const toggle = async (p: Pickup) => {
    await apiSend(`/api/pickup-locations/${p.id}`, "PATCH", { enabled: !p.enabled });
    await load();
  };
  const move = async (p: Pickup, dir: -1 | 1) => {
    const target = p.priority + dir;
    await apiSend(`/api/pickup-locations/${p.id}`, "PATCH", { priority: target });
    await load();
  };
  const remove = async (p: Pickup) => {
    await apiSend(`/api/pickup-locations/${p.id}`, "DELETE");
    await load();
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && !adding && (
        <p className="text-sm text-slate-500">No pickup locations saved yet.</p>
      )}

      <div className="space-y-2">
        {rows.map((p, i) => (
          <div key={p.id} className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 ${p.enabled ? "border-slate-200 dark:border-slate-700" : "border-slate-200 opacity-50 dark:border-slate-800"}`}>
            <IconMap width={18} height={18} className="text-slate-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{p.name}</span>
                {p.isPrimary && (
                  <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">Primary</span>
                )}
                {p.provider && <span className="text-xs text-slate-500">{p.provider}</span>}
              </div>
              <p className="text-xs text-slate-500">
                {[p.address, p.postcode, p.distanceKm != null ? `${p.distanceKm} km` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <button className="btn-ghost text-xs" onClick={() => move(p, -1)} disabled={i === 0}>↑</button>
              <button className="btn-ghost text-xs" onClick={() => move(p, 1)} disabled={i === rows.length - 1}>↓</button>
              {!p.isPrimary && <button className="btn-ghost text-xs" onClick={() => setPrimary(p)}>Set primary</button>}
              <button className="btn-ghost text-xs" onClick={() => toggle(p)}>{p.enabled ? "Disable" : "Enable"}</button>
              <button className="btn-ghost text-xs text-red-500" onClick={() => remove(p)}>
                <IconTrash width={14} height={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2">
          <input className="input sm:col-span-2" placeholder="Display name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Provider (InPost, DPD…)" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <input className="input" placeholder="Postcode" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className="input" type="number" placeholder="Distance (km)" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" onClick={add}>Add</button>
            <button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-secondary" onClick={() => setAdding(true)}>
          <IconPlus width={16} height={16} /> Add pickup location
        </button>
      )}

      <p className="text-xs text-slate-500">
        Note: there&apos;s no public Vinted directory API, so locations are entered manually. At checkout
        on Vinted, select your preferred point from the ones Vinted offers for that seller &amp; parcel —
        availability varies per order.
      </p>
    </div>
  );
}
