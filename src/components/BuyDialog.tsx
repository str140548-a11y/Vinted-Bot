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
  address: string | null;
  postcode: string | null;
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

/**
 * Confirmation screen before sending the user to Vinted.
 *
 * HONESTY: This dialog NEVER completes a purchase. There is no authorized Vinted
 * checkout API available to third parties. "Confirm & open on Vinted" records a
 * local purchase INTENT and opens the genuine listing in a new tab, with your
 * preferred pickup point shown as a reminder to select it manually at checkout.
 */
export function BuyDialog({
  review,
  onClose,
  onDone,
}: {
  review: { id: string; listing: ListingLike };
  onClose: () => void;
  onDone: () => void;
}) {
  const l = review.listing;
  const [pickups, setPickups] = useState<PickupLocation[]>([]);
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);

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
  const overBudget =
    settings?.maxTotalSpend != null && total > settings.maxTotalSpend;
  const chosenPickup = pickups.find((p) => p.id === selectedPickup) ?? null;

  const confirm = async () => {
    setBusy(true);
    try {
      // Record the local decision + purchase intent.
      await apiSend(`/api/reviews/${review.id}`, "PATCH", { decision: "approved" });
      await apiSend("/api/purchases", "POST", {
        listingId: l.id,
        deliveryPointName: chosenPickup?.name ?? null,
        status: "intended",
      });
      // Open the genuine Vinted listing so the user completes checkout there.
      window.open(l.url, "_blank", "noopener,noreferrer");
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
          <h2 className="text-lg font-semibold">Confirm purchase</h2>
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

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
          <p className="font-medium">How this works</p>
          <p className="mt-1">
            This app cannot buy on your behalf — Vinted has no authorized checkout API for third
            parties. Confirming records your intent and opens the real listing in a new tab.
            Complete payment on Vinted, and select{" "}
            <strong>{chosenPickup ? chosenPickup.name : "your preferred pickup point"}</strong> there
            if it&apos;s offered for this item.
          </p>
        </div>

        <label className="mb-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>
            I understand this opens Vinted and I&apos;ll complete the purchase myself. No payment is
            taken by this app.
          </span>
        </label>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!acknowledged || busy} onClick={confirm}>
            <IconExternal width={16} height={16} />
            {busy ? "Opening…" : "Confirm & open on Vinted"}
          </button>
        </div>
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
