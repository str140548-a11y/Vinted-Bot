/**
 * Normalized listing shape returned by any adapter. This is the contract the
 * monitoring engine depends on — adapters translate Vinted's raw payload into
 * this shape.
 */
export interface RawListing {
  /** Vinted's own numeric/string item id. Used as the dedup key. */
  vintedId: string;
  title: string;
  price: number;
  currency: string;
  /** Buyer-protection / service fee, if the source exposes it. */
  serviceFee?: number | null;
  shippingFee?: number | null;
  /** price + fees when known; otherwise null (we never fabricate it). */
  totalCost?: number | null;
  brand?: string | null;
  size?: string | null;
  condition?: string | null;
  imageUrl?: string | null;
  /** Canonical link to the real listing. */
  url: string;
  sellerName?: string | null;
  sellerRating?: number | null;
  /** When the item was created on Vinted, if known. */
  createdAtRemote?: Date | null;
}

export interface FetchParams {
  /** Free-text search. */
  keywords?: string | null;
  brand?: string | null;
  category?: string | null;
  size?: string | null;
  condition?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  /** Opaque Vinted catalog params forwarded verbatim by the http adapter. */
  rawParams?: Record<string, string>;
  /** Max items to request. */
  perPage?: number;
}

export interface FetchResult {
  listings: RawListing[];
  /** Which adapter produced this: "mock" | "http". Surfaced in the UI. */
  source: "mock" | "http";
}

export class RateLimitError extends Error {
  constructor(message = "Rate limited by Vinted") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

export interface VintedAdapter {
  readonly source: "mock" | "http";
  /** Human description surfaced in the UI/health panel. */
  readonly label: string;
  fetchListings(params: FetchParams): Promise<FetchResult>;
}
