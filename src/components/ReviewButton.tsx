"use client";

import Link from "next/link";
import { IconClock } from "./icons";

/**
 * Listings auto-create a review window when first detected, so this is simply a
 * link into the Review Queue. If you want per-listing re-open behavior later,
 * this is where it would hook in.
 */
export function ReviewButton({ listingId }: { listingId: string; onChanged?: () => void }) {
  return (
    <Link href={`/reviews#${listingId}`} className="btn-secondary w-full">
      <IconClock width={16} height={16} /> Review
    </Link>
  );
}
