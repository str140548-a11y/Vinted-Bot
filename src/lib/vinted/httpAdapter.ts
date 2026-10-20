import { env } from "../env";
import {
  AdapterError,
  RateLimitError,
  type FetchParams,
  type FetchResult,
  type RawListing,
  type VintedAdapter,
} from "./types";

/**
 * HTTP adapter — UNOFFICIAL polling of Vinted's internal catalog JSON endpoint.
 *
 * ============================= IMPORTANT / HONEST =============================
 * Vinted has NO public, documented, authorized API for third-party monitoring.
 * This adapter polls the same internal endpoint the Vinted website itself calls
 * (`/api/v2/catalog/items`). Using it for automation may violate Vinted's Terms
 * of Service. By setting VINTED_ADAPTER=http YOU take responsibility for that
 * decision and for compliance in your jurisdiction.
 *
 * This adapter:
 *   - Does NOT ask for or store your Vinted password.
 *   - Optionally sends a session cookie YOU provide via VINTED_COOKIE (many
 *     regions require an anonymous `_vinted_fr_session` cookie to be present).
 *   - Honors rate limiting (429) by surfacing RateLimitError so the engine can
 *     back off.
 *   - Parses defensively — Vinted's internal response shape is not a stable
 *     contract and can change without notice.
 *
 * It will NOT run in this offline sandbox (no network). It is intended to run
 * in YOUR deployment with real network access.
 * ============================================================================
 */
export class HttpVintedAdapter implements VintedAdapter {
  readonly source = "http" as const;
  readonly label = `Live polling (unofficial) — ${env.vintedBaseUrl}`;

  private buildUrl(params: FetchParams): string {
    const u = new URL("/api/v2/catalog/items", env.vintedBaseUrl);
    const q = u.searchParams;
    q.set("per_page", String(params.perPage ?? 20));
    q.set("order", "newest_first");
    if (params.keywords) q.set("search_text", params.keywords);
    if (params.minPrice != null) q.set("price_from", String(params.minPrice));
    if (params.maxPrice != null) q.set("price_to", String(params.maxPrice));
    // Forward opaque catalog params verbatim (catalog_ids, brand_ids, size_ids,
    // status_ids, etc.). The user configures these on the saved search.
    for (const [k, v] of Object.entries(params.rawParams ?? {})) {
      if (v != null && v !== "") q.set(k, v);
    }
    return u.toString();
  }

  async fetchListings(params: FetchParams): Promise<FetchResult> {
    const url = this.buildUrl(params);
    const headers: Record<string, string> = {
      "User-Agent": env.vintedUserAgent,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en",
      "X-Requested-With": "XMLHttpRequest",
    };
    if (env.vintedCookie) headers["Cookie"] = env.vintedCookie;

    let res: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
    } catch (err) {
      throw new AdapterError("Network request to Vinted failed", err);
    }

    if (res.status === 429) {
      throw new RateLimitError();
    }
    if (res.status === 401 || res.status === 403) {
      throw new AdapterError(
        `Vinted returned ${res.status}. A valid session cookie is usually required — set VINTED_COOKIE. See README.`,
      );
    }
    if (!res.ok) {
      throw new AdapterError(`Vinted returned HTTP ${res.status}`);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch (err) {
      throw new AdapterError("Could not parse Vinted JSON response", err);
    }

    const items = extractItems(json);
    const listings = items.map((it) => normalize(it, env.vintedBaseUrl)).filter(
      (x): x is RawListing => x !== null,
    );

    return { listings, source: "http" };
  }
}

/** Vinted returns { items: [...] } on the catalog endpoint. Defensive extract. */
function extractItems(json: unknown): Record<string, unknown>[] {
  if (json && typeof json === "object" && "items" in json) {
    const items = (json as { items: unknown }).items;
    if (Array.isArray(items)) return items as Record<string, unknown>[];
  }
  return [];
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length ? v : null;
}

/**
 * Normalize one raw Vinted item. The field layout below matches the observed
 * public catalog response shape; it is parsed defensively so missing fields
 * degrade gracefully rather than throwing.
 */
function normalize(it: Record<string, unknown>, base: string): RawListing | null {
  const id = it.id != null ? String(it.id) : null;
  if (!id) return null;

  // Price can appear as {amount, currency_code} or as a flat number.
  let price: number | null = null;
  let currency = "EUR";
  const priceObj = it.price as Record<string, unknown> | number | string | undefined;
  if (priceObj && typeof priceObj === "object") {
    price = num((priceObj as Record<string, unknown>).amount);
    currency = str((priceObj as Record<string, unknown>).currency_code) ?? currency;
  } else {
    price = num(priceObj);
  }
  if (price == null) return null;

  // Service / buyer-protection fee when exposed.
  let serviceFee: number | null = null;
  const sf = it.service_fee as Record<string, unknown> | undefined;
  if (sf && typeof sf === "object") serviceFee = num(sf.amount);

  let totalCost: number | null = null;
  const ti = it.total_item_price as Record<string, unknown> | undefined;
  if (ti && typeof ti === "object") totalCost = num(ti.amount);

  const photo = it.photo as Record<string, unknown> | undefined;
  const imageUrl =
    str(photo?.url) ??
    str((photo?.thumbnails as Record<string, unknown>[] | undefined)?.[0]?.url) ??
    null;

  const user = it.user as Record<string, unknown> | undefined;

  const url =
    str(it.url) ?? `${base.replace(/\/$/, "")}/items/${id}`;

  const createdTs = num(it.created_at_ts) ?? num(it.photo && (photo?.high_resolution as Record<string, unknown>)?.timestamp);

  return {
    vintedId: id,
    title: str(it.title) ?? `Item ${id}`,
    price,
    currency,
    serviceFee,
    shippingFee: null, // shipping depends on buyer locker choice; not in catalog
    totalCost,
    brand: str(it.brand_title) ?? str(it.brand),
    size: str(it.size_title) ?? str(it.size),
    condition: str(it.status),
    imageUrl,
    url,
    sellerName: str(user?.login),
    sellerRating: num(user?.feedback_reputation),
    createdAtRemote: createdTs ? new Date(createdTs * 1000) : null,
  };
}
