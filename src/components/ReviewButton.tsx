"use client";

import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { BuyDialog } from "./BuyDialog";
import type { ListingLike } from "./ListingCard";
import { IconCart } from "./icons";

/**
 * Starts an assisted-checkout session for a listing and opens the checkout
 * dialog. The session is recorded so the item appears in the Checkout Queue.
 * Nothing is reserved on Vinted — that only happens when you tap Buy now there.
 */
export function CheckoutButton({
  listingId,
  onChanged,
}: {
  listingId: string;
  onChanged?: () => void;
}) {
  const [listing, setListing] = useState<ListingLike | null>(null);
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      // Start/resume a checkout session, then load the listing for the dialog.
      await apiSend("/api/checkout", "POST", { listingId });
      const listings = await apiGet<ListingLike[]>("/api/listings?limit=200");
      const found = listings.find((l) => l.id === listingId) ?? null;
      setListing(found);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn-primary w-full" onClick={open} disabled={busy}>
        <IconCart width={16} height={16} /> {busy ? "Starting…" : "Checkout"}
      </button>
      {listing && (
        <BuyDialog
          listing={listing}
          onClose={() => setListing(null)}
          onDone={() => {
            setListing(null);
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
