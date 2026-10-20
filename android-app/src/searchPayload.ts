/**
 * Pure helpers for building the saved-search payload the backend expects.
 * Kept free of React Native imports so it can be unit-tested in isolation.
 */
export function numOrNull(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function toArr(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export interface SearchFormValues {
  name: string;
  keywords: string;
  brand: string;
  category: string;
  size: string;
  minPrice: string;
  maxPrice: string;
  maxTotalCost: string;
  preferredBrands: string;
  excludedKeywords: string;
  active: boolean;
  alertPriceDrops: boolean;
  notify: boolean;
}

export function buildSearchPayload(f: SearchFormValues) {
  return {
    name: f.name.trim(),
    active: f.active,
    keywords: f.keywords.trim() || null,
    brand: f.brand.trim() || null,
    category: f.category.trim() || null,
    size: f.size.trim() || null,
    minPrice: numOrNull(f.minPrice),
    maxPrice: numOrNull(f.maxPrice),
    maxTotalCost: numOrNull(f.maxTotalCost),
    preferredBrands: toArr(f.preferredBrands),
    excludedKeywords: toArr(f.excludedKeywords),
    alertPriceDrops: f.alertPriceDrops,
    notify: f.notify,
  };
}
