import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the DB at a throwaway SQLite file BEFORE importing anything that opens it.
const dir = mkdtempSync(join(tmpdir(), "vinted-test-"));
const dbPath = join(dir, "test.db");
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.VINTED_ADAPTER = "mock";

// Dynamic imports so env is set first.
let db: typeof import("@/db").db;
let schema: typeof import("@/db").schema;
let runMonitorTick: typeof import("@/lib/monitor").runMonitorTick;

beforeAll(async () => {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
  sqlite.close();

  const mod = await import("@/db");
  db = mod.db;
  schema = mod.schema;
  runMonitorTick = (await import("@/lib/monitor")).runMonitorTick;
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

beforeEach(async () => {
  // Reset tables between tests.
  await db.delete(schema.reviewWindows);
  await db.delete(schema.priceHistory);
  await db.delete(schema.notifications);
  await db.delete(schema.listings);
  await db.delete(schema.savedSearches);
  await db.delete(schema.settings);
  await db.delete(schema.monitorHealth);
});

describe("monitor engine (integration)", () => {
  it("detects matches, dedupes, and creates review windows + notifications", async () => {
    await db.insert(schema.savedSearches).values({
      name: "Any items",
      active: true,
      notify: true,
    });

    const first = await runMonitorTick();
    expect(first.searches).toBe(1);
    const firstMatches = first.results.reduce((a, r) => a + r.newMatches, 0);
    expect(firstMatches).toBeGreaterThan(0);

    const listings1 = await db.select().from(schema.listings);
    const reviews1 = await db.select().from(schema.reviewWindows);
    const notifs1 = await db.select().from(schema.notifications);

    // Every new listing gets a review window and a notification.
    expect(reviews1.length).toBe(listings1.length);
    expect(notifs1.length).toBe(listings1.length);
    expect(reviews1.every((r) => r.status === "reviewing")).toBe(true);
    expect(listings1.every((l) => l.source === "mock")).toBe(true);

    // Second tick immediately after: same ids => dedup => no new listings.
    const second = await runMonitorTick();
    const secondMatches = second.results.reduce((a, r) => a + r.newMatches, 0);
    expect(secondMatches).toBe(0);

    const listings2 = await db.select().from(schema.listings);
    expect(listings2.length).toBe(listings1.length);
  });

  it("does not notify when the search has notify disabled", async () => {
    await db.insert(schema.savedSearches).values({
      name: "Silent",
      active: true,
      notify: false,
    });
    await runMonitorTick();
    const notifs = await db.select().from(schema.notifications);
    expect(notifs.length).toBe(0);
  });

  it("skips paused searches", async () => {
    await db.insert(schema.savedSearches).values({
      name: "Paused",
      active: false,
      notify: true,
    });
    const res = await runMonitorTick();
    expect(res.searches).toBe(0);
    const listings = await db.select().from(schema.listings);
    expect(listings.length).toBe(0);
  });

  it("respects maxPrice filtering end to end", async () => {
    await db.insert(schema.savedSearches).values({
      name: "Cheap only",
      active: true,
      maxPrice: 15,
      notify: false,
    });
    await runMonitorTick();
    const listings = await db.select().from(schema.listings);
    expect(listings.every((l) => l.price <= 15)).toBe(true);
  });

  it("updates monitor health counters", async () => {
    await db.insert(schema.savedSearches).values({ name: "H", active: true, notify: false });
    await runMonitorTick();
    const health = await db.select().from(schema.monitorHealth);
    expect(health[0]?.totalChecks).toBeGreaterThanOrEqual(1);
    expect(health[0]?.running).toBe(false);
  });
});
