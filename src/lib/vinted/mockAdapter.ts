import type { FetchParams, FetchResult, RawListing, VintedAdapter } from "./types";

/**
 * MOCK adapter.
 *
 * Generates deterministic-but-evolving fake listings so the ENTIRE app can be
 * run, demoed and tested with zero network access. Every listing produced here
 * carries source: "mock" and the UI labels it clearly as mock data. It is NEVER
 * presented as live Vinted data.
 *
 * The generator uses time buckets so that on each poll it tends to surface a
 * small number of "new" items (new vintedIds), which lets you watch the
 * monitor, dedup, notifications and the review window work end to end offline.
 */

const BRANDS = ["Nike", "Adidas", "The North Face", "Carhartt", "Patagonia", "Stone Island", "Levi's", "Arc'teryx"];
const CONDITIONS = ["new_with_tags", "very_good", "good", "satisfactory"];
const SIZES = ["S", "M", "L", "XL", "38", "40", "42"];
const TITLES = [
  "Vintage fleece jacket",
  "Tech shell waterproof",
  "Heavyweight hoodie",
  "Cargo work pants",
  "Puffer jacket",
  "Retro track top",
  "Selvedge denim jeans",
  "Gore-Tex parka",
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic pseudo-random in [0,1) from a seed. */
function rng(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export class MockVintedAdapter implements VintedAdapter {
  readonly source = "mock" as const;
  readonly label = "Mock data (offline demo — NOT live Vinted data)";

  async fetchListings(params: FetchParams): Promise<FetchResult> {
    // Time bucket changes roughly every 20s so new items appear across polls.
    const bucket = Math.floor(Date.now() / 20000);
    const searchSeed = hashString(
      [params.keywords, params.brand, params.category, params.size].filter(Boolean).join("|") ||
        "all",
    );

    const count = 6;
    const listings: RawListing[] = [];
    for (let i = 0; i < count; i++) {
      // Mix the bucket into a subset of items so some ids are "new" each poll.
      const makeFresh = i < 2; // first two items rotate with the bucket
      const seed = searchSeed + i * 7919 + (makeFresh ? bucket * 104729 : 0);
      const r = (n: number) => rng(seed + n);

      const brand = params.brand || BRANDS[Math.floor(r(1) * BRANDS.length)];
      const basePrice = 8 + Math.floor(r(2) * 90);
      const price = Number(basePrice.toFixed(2));
      const shippingFee = Number((2 + r(3) * 4).toFixed(2));
      const serviceFee = Number((0.7 + price * 0.05).toFixed(2));
      const total = Number((price + shippingFee + serviceFee).toFixed(2));
      const vintedId = `mock-${seed}`;

      listings.push({
        vintedId,
        title: `${brand} ${TITLES[Math.floor(r(4) * TITLES.length)]}`,
        price,
        currency: "EUR",
        serviceFee,
        shippingFee,
        totalCost: total,
        brand,
        size: params.size || SIZES[Math.floor(r(5) * SIZES.length)],
        condition: params.condition || CONDITIONS[Math.floor(r(6) * CONDITIONS.length)],
        // A stable placeholder image service so cards render offline.
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(vintedId)}/400/500`,
        url: `https://www.vinted.com/items/${encodeURIComponent(vintedId)}`,
        sellerName: `seller_${Math.floor(r(7) * 9000) + 1000}`,
        sellerRating: Number((3.5 + r(8) * 1.5).toFixed(2)),
        createdAtRemote: new Date(Date.now() - Math.floor(r(9) * 3600_000)),
      });
    }

    // Respect maxPrice/minPrice at the source level too (realistic behavior).
    const filtered = listings.filter((l) => {
      if (params.minPrice != null && l.price < params.minPrice) return false;
      if (params.maxPrice != null && l.price > params.maxPrice) return false;
      return true;
    });

    return { listings: filtered, source: "mock" };
  }
}
