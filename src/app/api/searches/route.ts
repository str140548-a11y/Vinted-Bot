import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";
import { savedSearchInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    return db.select().from(schema.savedSearches).orderBy(desc(schema.savedSearches.createdAt));
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json();
    const input = savedSearchInput.parse(body);
    const [created] = await db
      .insert(schema.savedSearches)
      .values({
        name: input.name,
        active: input.active,
        keywords: input.keywords ?? null,
        brand: input.brand ?? null,
        category: input.category ?? null,
        size: input.size ?? null,
        condition: input.condition ?? null,
        minPrice: input.minPrice ?? null,
        maxPrice: input.maxPrice ?? null,
        maxTotalCost: input.maxTotalCost ?? null,
        preferredBrands: JSON.stringify(input.preferredBrands),
        excludedBrands: JSON.stringify(input.excludedBrands),
        excludedKeywords: JSON.stringify(input.excludedKeywords),
        minSellerRating: input.minSellerRating ?? null,
        maxSellerRating: input.maxSellerRating ?? null,
        newListingsOnly: input.newListingsOnly,
        alertPriceDrops: input.alertPriceDrops,
        notify: input.notify,
        priorityDealPct: input.priorityDealPct ?? null,
        rawParams: JSON.stringify(input.rawParams),
      })
      .returning();
    return created;
  });
}
