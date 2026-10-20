/**
 * Seed the database with a couple of example saved searches, pickup locations,
 * and the settings singleton. Safe to run multiple times (idempotent-ish:
 * skips if data already present). Run with `npm run db:seed`.
 */
import "dotenv/config";
import { db, schema } from "@/db";

async function main() {
  const existing = await db.select().from(schema.savedSearches);
  if (existing.length > 0) {
    console.log("Seed skipped — saved searches already exist.");
    return;
  }

  await db.insert(schema.settings).values({ id: "singleton" }).onConflictDoNothing();
  await db.insert(schema.monitorHealth).values({ id: "singleton" }).onConflictDoNothing();

  await db.insert(schema.savedSearches).values([
    {
      name: "North Face fleece under €40",
      keywords: "fleece",
      brand: "The North Face",
      condition: "very_good",
      maxPrice: 40,
      maxTotalCost: 48,
      preferredBrands: JSON.stringify(["The North Face", "Patagonia"]),
      excludedKeywords: JSON.stringify(["kids", "damaged"]),
      newListingsOnly: true,
      alertPriceDrops: true,
      notify: true,
      priorityDealPct: 0.3,
      active: true,
    },
    {
      name: "Carhartt cargo pants M",
      keywords: "cargo",
      brand: "Carhartt",
      size: "M",
      maxPrice: 60,
      notify: true,
      active: true,
    },
  ]);

  await db.insert(schema.pickupLocations).values([
    {
      name: "InPost Locker — High Street",
      provider: "InPost",
      address: "12 High Street",
      postcode: "SW1A 1AA",
      distanceKm: 0.4,
      priority: 0,
      enabled: true,
      isPrimary: true,
    },
    {
      name: "Local Corner Shop Pickup",
      provider: "Yodel",
      address: "88 Market Rd",
      postcode: "SW1A 2BB",
      distanceKm: 1.1,
      priority: 1,
      enabled: true,
      isPrimary: false,
    },
  ]);

  console.log("✓ Seed complete");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
