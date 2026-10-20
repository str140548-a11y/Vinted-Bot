import { eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SavedSearch } from "@/db/schema";
import { logEvent } from "./logger";
import { evaluateMatch, type SearchCriteria } from "./matching";
import { dispatchNotification } from "./notify";
import { getSettings, getMonitorHealth } from "./settings";
import { getAdapter, RateLimitError, type RawListing } from "./vinted";

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function toCriteria(s: SavedSearch): SearchCriteria {
  return {
    keywords: s.keywords,
    brand: s.brand,
    condition: s.condition,
    size: s.size,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    maxTotalCost: s.maxTotalCost,
    preferredBrands: parseJsonArray(s.preferredBrands),
    excludedBrands: parseJsonArray(s.excludedBrands),
    excludedKeywords: parseJsonArray(s.excludedKeywords),
    minSellerRating: s.minSellerRating,
    maxSellerRating: s.maxSellerRating,
    priorityDealPct: s.priorityDealPct,
  };
}

export interface SearchRunResult {
  searchId: string;
  checked: number;
  newMatches: number;
  priceDrops: number;
  status: "ok" | "error" | "rate_limited";
  error?: string;
}

/**
 * Run a single saved search once: fetch, dedup, filter, persist new matches,
 * detect price drops, create review windows & notifications. Idempotent w.r.t.
 * duplicates thanks to the unique vintedId constraint.
 */
export async function runSearch(search: SavedSearch): Promise<SearchRunResult> {
  const settings = await getSettings();
  const adapter = getAdapter(settings.adapter as "mock" | "http");
  const criteria = toCriteria(search);

  let rawParams: Record<string, string> = {};
  try {
    rawParams = JSON.parse(search.rawParams) as Record<string, string>;
  } catch {
    rawParams = {};
  }

  let newMatches = 0;
  let priceDrops = 0;
  let checked = 0;

  try {
    const { listings, source } = await adapter.fetchListings({
      keywords: search.keywords,
      brand: search.brand,
      category: search.category,
      size: search.size,
      condition: search.condition,
      minPrice: search.minPrice,
      maxPrice: search.maxPrice,
      rawParams,
      perPage: 20,
    });
    checked = listings.length;

    for (const raw of listings) {
      const outcome = evaluateMatch(raw, criteria);
      if (!outcome.matched) continue;

      const [existing] = await db
        .select()
        .from(schema.listings)
        .where(eq(schema.listings.vintedId, raw.vintedId))
        .limit(1);

      if (!existing) {
        await persistNewMatch(raw, search, source, outcome.reason, outcome.priority);
        newMatches++;
      } else {
        await db
          .update(schema.listings)
          .set({ lastSeenAt: new Date() })
          .where(eq(schema.listings.id, existing.id));

        if (search.alertPriceDrops && raw.price < existing.price) {
          await db
            .insert(schema.priceHistory)
            .values({ listingId: existing.id, price: raw.price });
          await db
            .update(schema.listings)
            .set({ price: raw.price, totalCost: raw.totalCost ?? existing.totalCost })
            .where(eq(schema.listings.id, existing.id));
          priceDrops++;
          if (search.notify) {
            await dispatchNotification({
              title: `Price drop: ${existing.title}`,
              body: `${existing.price} -> ${raw.price} ${raw.currency}`,
              priority: outcome.priority,
              listingId: existing.id,
              savedSearchId: search.id,
              url: existing.url,
              imageUrl: existing.imageUrl,
            });
          }
        }
      }
    }

    await db
      .update(schema.savedSearches)
      .set({ lastCheckedAt: new Date(), lastStatus: "ok", lastError: null })
      .where(eq(schema.savedSearches.id, search.id));

    return { searchId: search.id, checked, newMatches, priceDrops, status: "ok" };
  } catch (err) {
    const isRateLimit = err instanceof RateLimitError;
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.savedSearches)
      .set({
        lastCheckedAt: new Date(),
        lastStatus: isRateLimit ? "rate_limited" : "error",
        lastError: message,
      })
      .where(eq(schema.savedSearches.id, search.id));
    await logEvent("error", "monitor", `Search "${search.name}" failed`, {
      searchId: search.id,
      message,
      rateLimited: isRateLimit,
    });
    return {
      searchId: search.id,
      checked,
      newMatches,
      priceDrops,
      status: isRateLimit ? "rate_limited" : "error",
      error: message,
    };
  }
}

async function persistNewMatch(
  raw: RawListing,
  search: SavedSearch,
  source: "mock" | "http",
  reason: string,
  priority: boolean,
): Promise<void> {
  const settings = await getSettings();

  const [listing] = await db
    .insert(schema.listings)
    .values({
      vintedId: raw.vintedId,
      title: raw.title,
      price: raw.price,
      currency: raw.currency,
      serviceFee: raw.serviceFee ?? null,
      shippingFee: raw.shippingFee ?? null,
      totalCost: raw.totalCost ?? null,
      brand: raw.brand ?? null,
      size: raw.size ?? null,
      condition: raw.condition ?? null,
      imageUrl: raw.imageUrl ?? null,
      url: raw.url,
      sellerName: raw.sellerName ?? null,
      sellerRating: raw.sellerRating ?? null,
      source,
      matchReason: reason,
      availability: "available",
      savedSearchId: search.id,
    })
    .returning();

  await db.insert(schema.priceHistory).values({ listingId: listing.id, price: raw.price });

  // NOTE: We intentionally do NOT auto-start any timer here. An inspection timer
  // is opt-in (started by the user from the Checkout/Inspect screen) and is a
  // purely LOCAL stopwatch — it never implies Vinted has reserved the item.
  // Vinted's real pending-payment hold only exists once the user opens the
  // genuine checkout inside Vinted; see src/lib/checkout.ts and LIMITATIONS.md.
  void settings;

  if (search.notify) {
    const feeNote = raw.totalCost != null ? ` (total ~${raw.totalCost} ${raw.currency})` : "";
    await dispatchNotification({
      title: `${priority ? "🔥 Deal: " : "New match: "}${raw.title}`,
      body: `${raw.price} ${raw.currency}${feeNote} — ${reason}`,
      priority,
      listingId: listing.id,
      savedSearchId: search.id,
      url: raw.url,
      imageUrl: raw.imageUrl,
    });
  }
}

/**
 * One full monitor tick: run every active search, mark expired review windows,
 * update health, and (optionally) apply data retention. Returns a summary.
 */
export async function runMonitorTick(): Promise<{
  searches: number;
  results: SearchRunResult[];
}> {
  await getMonitorHealth();
  await db
    .update(schema.monitorHealth)
    .set({ running: true, lastRunAt: new Date() })
    .where(eq(schema.monitorHealth.id, "singleton"));

  const searches = await db
    .select()
    .from(schema.savedSearches)
    .where(eq(schema.savedSearches.active, true));

  const results: SearchRunResult[] = [];
  for (const search of searches) {
    results.push(await runSearch(search));
  }

  const anyError = results.some((r) => r.status === "error");
  const totalMatches = results.reduce((a, r) => a + r.newMatches, 0);
  const health = await getMonitorHealth();
  await db
    .update(schema.monitorHealth)
    .set({
      running: false,
      lastSuccessAt: anyError ? health.lastSuccessAt : new Date(),
      lastErrorAt: anyError ? new Date() : health.lastErrorAt,
      lastError: anyError
        ? results.find((r) => r.status === "error")?.error ?? "unknown"
        : health.lastError,
      consecutiveErrors: anyError ? health.consecutiveErrors + 1 : 0,
      totalChecks: health.totalChecks + 1,
      totalMatches: health.totalMatches + totalMatches,
      updatedAt: new Date(),
    })
    .where(eq(schema.monitorHealth.id, "singleton"));

  return { searches: searches.length, results };
}

/** Apply data-retention: delete old listings (cascade) beyond the window. */
export async function applyRetention(): Promise<number> {
  const settings = await getSettings();
  const days = settings.dataRetentionDays ?? 30;
  const cutoff = new Date(Date.now() - days * 86400_000);

  // Find purchased listing ids to protect them.
  const purchased = await db
    .select({ listingId: schema.purchases.listingId })
    .from(schema.purchases);
  const protectedIds = new Set(purchased.map((p) => p.listingId));

  const old = await db
    .select({ id: schema.listings.id })
    .from(schema.listings)
    .where(lt(schema.listings.firstSeenAt, cutoff));

  let count = 0;
  for (const row of old) {
    if (protectedIds.has(row.id)) continue;
    await db.delete(schema.listings).where(eq(schema.listings.id, row.id));
    count++;
  }
  if (count) await logEvent("info", "monitor", `Retention removed ${count} old listings`);
  return count;
}
