"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { conditionLabel, money } from "@/lib/format";
import type { ListingLike } from "./ListingCard";
import { IconExternal, IconWarn, IconX } from "./icons";

interface PickupLocation {
  id: string;
  name: string;
  provider: string | null;
  enabled: boolean;
  isPrimary: boolean;
  priority: number;
}

interface SettingsShape {
  quickBuyEnabled: boolean;
  requireConfirm: boolean;
  maxTotalSpend: number | null;
  defaultMaxPrice: number | null;
}

interface CheckoutSession {
  id: string;
  status: string;
}

/**
 * Assisted Checkout launcher.
 *
 * HONESTY (see LIMITATIONS.md): this app cannot open Vinted's checkout session
 * or create any reservation. Vinted's genuine pending-payment hold is created
 * only when YOU tap "Buy now" inside Vinted. This dialog gets you there as fast
 * as honestly possible: it records the session, shows the total + your pickup
 * preference, then opens the real listing. You inspect, authenticate with your
 * bank, and complete or abandon the purchase on Vinted itself.
 */
export function BuyDialog({
  listing,
  onClose,
  onDone,
}: {
  listing: ListingLike;
  onClose: () => void;
  onDone: () => void;
}) {
  const l = listing;
  const [pickups, setPickups] = useState<PickupLocation[]>([]);
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([
        apiGet<PickupLocation[]>("/api/pickup-locations"),
        apiGet<SettingsShape>("/api/settings"),
      ]);
      setPickups(p);
      setSettings(s);
      const primary = p.find((x) => x.isPrimary && x.enabled) ?? p.find((x) => x.enabled);
      setSelectedPickup(primary?.id ?? null);
    })();
  }, []);

  const total = l.totalCost ?? l.price + (l.serviceFee ?? 0) + (l.shippingFee ?? 0);
  const overBudget = settings?.maxTotalSpend != null && total > settings.maxTotalSpend;
  const chosenPickup = pickups.find((p) => p.id === selectedPickup) ?? null;

  // Open the real Vinted listing and record the handoff (status: launched).
  const launchToVinted = async () => {
    setBusy(true);
    try {
      const session = await apiSend<CheckoutSession>("/api/checkout", "POST", {
        listingId: l.id,
        deliveryPointName: chosenPickup?.name ?? null,
      });
      setSessionId(session.id);
      await apiSend(`/api/checkout/${session.id}`, "PATCH", { status: "launched" });
      // Also record a purchase intent for the history view.
      await apiSend("/api/purchases", "POST", {
        listingId: l.id,
        deliveryPointName: chosenPickup?.name ?? null,
        status: "intended",
      });
      window.open(l.url, "_blank", "noopener,noreferrer");
      setLaunched(true);
    } finally {
      setBusy(false);
    }
  };

  // After launching, the user tells us the real outcome on Vinted.
  const report = async (status: "completed" | "abandoned") => {
    setBusy(true);
    try {
      if (sessionId) await apiSend(`/api/checkout/${sessionId}`, "PATCH", { status });
      await apiSend("/api/purchases", "POST", {
        listingId: l.id,
        status: status === "completed" ? "confirmed" : "abandoned",
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">Assisted checkout</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        <div className="flex gap-3">
          <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            {l.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.imageUrl} alt={l.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 text-sm">
            <p className="font-medium">{l.title}</p>
            <p className="text-slate-500">{l.brand}{l.size ? ` · Size ${l.size}` : ""}</p>
            <p className="text-slate-500">{conditionLabel(l.condition)}</p>
            {l.sellerName && (
              <p className="text-slate-500">
                Seller: {l.sellerName}
                {l.sellerRating != null && ` (★ ${l.sellerRating.toFixed(1)})`}
              </p>
            )}
          </div>
        </div>

        <dl className="my-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <Line label="Item price" value={money(l.price, l.currency)} />
          <Line label="Buyer protection fee" value={l.serviceFee != null ? money(l.serviceFee, l.currency) : "shown at checkout"} />
          <Line label="Shipping" value={l.shippingFee != null ? money(l.shippingFee, l.currency) : "depends on method"} />
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700">
            <span>Estimated total</span>
            <span>{money(total, l.currency)}</span>
          </div>
        </dl>

        {overBudget && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <IconWarn width={16} height={16} /> Estimated total exceeds your max total spend
            ({money(settings?.maxTotalSpend, l.currency)}).
          </div>
        )}

        <div className="mb-3">
          <label className="label">Preferred pickup point (reminder for checkout)</label>
          {pickups.length === 0 ? (
            <p className="text-xs text-slate-500">
              No pickup locations saved. Add some in Settings → Delivery Preferences.
            </p>
          ) : (
            <select
              className="input"
              value={selectedPickup ?? ""}
              onChange={(e) => setSelectedPickup(e.target.value || null)}
              disabled={launched}
            >
              <option value="">No preference</option>
              {pickups
                .filter((p) => p.enabled)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isPrimary ? "★ " : ""}
                    {p.name} {p.provider ? `(${p.provider})` : ""}
                  </option>
                ))}
            </select>
          )}
        </div>

        {!launched ? (
          <>
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
              <p className="font-medium">How assisted checkout works — and what it can&apos;t do</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>This opens the <strong>genuine Vinted listing</strong> where <strong>Buy now</strong> lives.</li>
                <li>
                  Any temporary hold is created <strong>by Vinted</strong> when you tap Buy now — this app
                  doesn&apos;t reserve the item and makes no promise about how long it&apos;s held.
                </li>
                <li>You inspect, authenticate with your bank (3DS), and complete or abandon on Vinted.</li>
                <li>
                  Select{" "}
                  <strong>{chosenPickup ? chosenPickup.name : "your preferred pickup point"}</strong>{" "}
                  there if Vinted offers it for this item.
                </li>
                <li>No payment is taken by this app. It never stores card details or simulates a purchase.</li>
              </ul>
            </div>

            <label className="mb-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>I understand this opens Vinted and I&apos;ll complete the purchase myself there.</span>
            </label>

            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={!acknowledged || busy} onClick={launchToVinted}>
                <IconExternal width={16} height={16} />
                {busy ? "Opening…" : "Open Vinted to buy"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/30 dark:text-brand-300">
              Vinted opened in a new tab. Complete the purchase there, then tell us what happened so
              your history stays accurate.
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 underline">
                <IconExternal width={14} height={14} /> Reopen Vinted listing
              </a>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" disabled={busy} onClick={() => report("abandoned")}>
                I didn&apos;t buy it
              </button>
              <button className="btn-primary" disabled={busy} onClick={() => report("completed")}>
                I bought it on Vinted
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
