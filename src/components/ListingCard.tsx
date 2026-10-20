"use client";

import Link from "next/link";
import { conditionLabel, money, relativeTime } from "@/lib/format";
import { IconExternal } from "./icons";

export interface ListingLike {
  id: string;
  vintedId: string;
  title: string;
  price: number;
  currency: string;
  totalCost: number | null;
  serviceFee: number | null;
  shippingFee: number | null;
  brand: string | null;
  size: string | null;
  condition: string | null;
  imageUrl: string | null;
  url: string;
  sellerName: string | null;
  sellerRating: number | null;
  source: string;
  matchReason: string | null;
  availability: string;
  firstSeenAt: string | number | Date;
}

export function AvailabilityBadge({ availability }: { availability: string }) {
  const map: Record<string, string> = {
    available: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300",
    sold: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    unknown: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  const label =
    availability === "available"
      ? "Available"
      : availability === "sold"
        ? "Sold"
        : "Status unknown";
  return <span className={`badge ${map[availability] ?? map.unknown}`}>{label}</span>;
}

export function ListingCard({
  listing,
  footer,
  compact,
}: {
  listing: ListingLike;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.imageUrl}
            alt={listing.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No image
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <AvailabilityBadge availability={listing.availability} />
          {listing.source === "mock" && (
            <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              mock
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</h3>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand-700 dark:text-brand-400">
            {money(listing.price, listing.currency)}
          </span>
          {listing.totalCost != null && (
            <span className="text-xs text-slate-500">
              ~{money(listing.totalCost, listing.currency)} total
            </span>
          )}
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-1 text-xs text-slate-500">
            {listing.brand && <span className="badge bg-slate-100 dark:bg-slate-800">{listing.brand}</span>}
            {listing.size && <span className="badge bg-slate-100 dark:bg-slate-800">Size {listing.size}</span>}
            {listing.condition && (
              <span className="badge bg-slate-100 dark:bg-slate-800">{conditionLabel(listing.condition)}</span>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500">
          {listing.sellerName && (
            <span>
              {listing.sellerName}
              {listing.sellerRating != null && ` · ★ ${listing.sellerRating.toFixed(1)}`}
            </span>
          )}
          <span className="block">Seen {relativeTime(listing.firstSeenAt)}</span>
        </div>

        {listing.matchReason && (
          <p className="line-clamp-2 rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {listing.matchReason}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Link
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full"
          >
            <IconExternal width={16} height={16} /> Open on Vinted
          </Link>
          {footer}
        </div>
      </div>
    </div>
  );
}
