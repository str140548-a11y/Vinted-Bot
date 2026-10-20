import type { RawListing } from "./vinted/types";

export interface SearchCriteria {
  keywords?: string | null;
  brand?: string | null;
  condition?: string | null;
  size?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  maxTotalCost?: number | null;
  preferredBrands: string[];
  excludedBrands: string[];
  excludedKeywords: string[];
  minSellerRating?: number | null;
  maxSellerRating?: number | null;
  priorityDealPct?: number | null;
}

export interface MatchOutcome {
  matched: boolean;
  /** Reason it matched (for the notification) OR why it was filtered out. */
  reason: string;
  /** True if the deal is good enough to flag as priority. */
  priority: boolean;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/**
 * Pure function: decide whether a raw listing matches a saved search's
 * criteria. Returns a human-readable reason either way so the UI/notification
 * can explain the match. No side effects.
 */
export function evaluateMatch(
  listing: RawListing,
  c: SearchCriteria,
): MatchOutcome {
  const title = norm(listing.title);
  const brand = norm(listing.brand);

  // Excluded brands (hard reject).
  for (const b of c.excludedBrands) {
    if (brand && brand.includes(norm(b))) {
      return { matched: false, reason: `Excluded brand: ${b}`, priority: false };
    }
  }

  // Excluded keywords (hard reject, checked against title).
  for (const kw of c.excludedKeywords) {
    if (kw && title.includes(norm(kw))) {
      return { matched: false, reason: `Excluded keyword: ${kw}`, priority: false };
    }
  }

  // Keyword must-match (all words present in title or brand).
  if (c.keywords) {
    const words = norm(c.keywords).split(/\s+/).filter(Boolean);
    const haystack = `${title} ${brand}`;
    const missing = words.filter((w) => !haystack.includes(w));
    if (missing.length) {
      return {
        matched: false,
        reason: `Missing keywords: ${missing.join(", ")}`,
        priority: false,
      };
    }
  }

  // Brand filter.
  if (c.brand && !brand.includes(norm(c.brand))) {
    return { matched: false, reason: `Brand mismatch (wanted ${c.brand})`, priority: false };
  }

  // Condition filter.
  if (c.condition && norm(listing.condition) !== norm(c.condition)) {
    return {
      matched: false,
      reason: `Condition mismatch (wanted ${c.condition})`,
      priority: false,
    };
  }

  // Size filter.
  if (c.size && norm(listing.size) !== norm(c.size)) {
    return { matched: false, reason: `Size mismatch (wanted ${c.size})`, priority: false };
  }

  // Price bounds.
  if (c.minPrice != null && listing.price < c.minPrice) {
    return { matched: false, reason: `Below min price (${listing.price})`, priority: false };
  }
  if (c.maxPrice != null && listing.price > c.maxPrice) {
    return { matched: false, reason: `Above max price (${listing.price})`, priority: false };
  }

  // Max total cost — only enforced when total is actually known.
  const total = listing.totalCost ?? null;
  if (c.maxTotalCost != null && total != null && total > c.maxTotalCost) {
    return {
      matched: false,
      reason: `Total ${total} exceeds max total ${c.maxTotalCost}`,
      priority: false,
    };
  }

  // Seller rating bounds — only enforced when rating is known.
  if (c.minSellerRating != null && listing.sellerRating != null && listing.sellerRating < c.minSellerRating) {
    return {
      matched: false,
      reason: `Seller rating ${listing.sellerRating} below min`,
      priority: false,
    };
  }
  if (c.maxSellerRating != null && listing.sellerRating != null && listing.sellerRating > c.maxSellerRating) {
    return {
      matched: false,
      reason: `Seller rating ${listing.sellerRating} above max`,
      priority: false,
    };
  }

  // Matched. Build a positive reason & decide priority.
  const reasons: string[] = [];
  if (c.keywords) reasons.push(`matches "${c.keywords}"`);
  if (c.brand) reasons.push(`brand ${c.brand}`);
  if (c.maxPrice != null) reasons.push(`under ${c.maxPrice}`);
  if (c.preferredBrands.some((b) => brand.includes(norm(b)))) {
    reasons.push("preferred brand");
  }

  // Priority deal: when a priorityDealPct is set and we have enough info to
  // compare against a ceiling (maxTotalCost preferred, else maxPrice).
  let priority = false;
  const ceiling = c.maxTotalCost ?? c.maxPrice ?? null;
  const compare = total ?? listing.price;
  if (c.priorityDealPct != null && ceiling != null && ceiling > 0) {
    const threshold = (1 - c.priorityDealPct) * ceiling;
    if (compare <= threshold) {
      priority = true;
      reasons.push(`priority deal (<= ${Math.round(c.priorityDealPct * 100)}% off ceiling)`);
    }
  }

  return {
    matched: true,
    reason: reasons.length ? reasons.join(", ") : "matches saved search",
    priority,
  };
}
