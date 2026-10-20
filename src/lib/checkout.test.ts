import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "vinted-checkout-test-"));
const dbPath = join(dir, "test.db");
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.VINTED_ADAPTER = "mock";

let db: typeof import("@/db").db;
let schema: typeof import("@/db").schema;
let startCheckoutSession: typeof import("@/lib/checkout").startCheckoutSession;
let transitionCheckout: typeof import("@/lib/checkout").transitionCheckout;
let buildCheckoutDeepLink: typeof import("@/lib/checkout").buildCheckoutDeepLink;

async function insertListing(id = "chk-1", price = 20) {
  const [row] = await db
    .insert(schema.listings)
    .values({
      vintedId: id,
      title: "Test item",
      price,
      currency: "EUR",
      totalCost: price + 3,
      url: `https://www.vinted.com/items/${id}`,
      source: "mock",
    })
    .returning();
  return row;
}

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
  const c = await import("@/lib/checkout");
  startCheckoutSession = c.startCheckoutSession;
  transitionCheckout = c.transitionCheckout;
  buildCheckoutDeepLink = c.buildCheckoutDeepLink;
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

beforeEach(async () => {
  await db.delete(schema.checkoutSessions);
  await db.delete(schema.listings);
});

describe("assisted checkout", () => {
  it("deep link points at the genuine listing URL (no fabricated checkout URL)", () => {
    const url = "https://www.vinted.co.uk/items/999-foo";
    expect(buildCheckoutDeepLink(url)).toBe(url);
  });

  it("starts an inspecting session and snapshots price/total", async () => {
    const listing = await insertListing("chk-a", 30);
    const session = await startCheckoutSession(listing.id, { deliveryPointName: "InPost X" });
    expect(session.status).toBe("inspecting");
    expect(session.priceAtStart).toBe(30);
    expect(session.totalAtStart).toBe(33);
    expect(session.deliveryPointName).toBe("InPost X");
    // No reservation is implied — launchedAt/decidedAt are null.
    expect(session.launchedAt).toBeNull();
    expect(session.decidedAt).toBeNull();
  });

  it("optionally records a local inspection stopwatch only when requested", async () => {
    const listing = await insertListing("chk-b");
    const withTimer = await startCheckoutSession(listing.id, { inspectionDurationSec: 900 });
    expect(withTimer.inspectionDurationSec).toBe(900);
    expect(withTimer.inspectionStartedAt).not.toBeNull();

    await db.delete(schema.checkoutSessions);
    const noTimer = await startCheckoutSession(listing.id);
    expect(noTimer.inspectionDurationSec).toBeNull();
    expect(noTimer.inspectionStartedAt).toBeNull();
  });

  it("resumes an open session rather than duplicating", async () => {
    const listing = await insertListing("chk-c");
    const a = await startCheckoutSession(listing.id);
    const b = await startCheckoutSession(listing.id);
    expect(b.id).toBe(a.id);
    const all = await db.select().from(schema.checkoutSessions);
    expect(all.length).toBe(1);
  });

  it("transitions launched -> completed only via explicit calls, stamping times", async () => {
    const listing = await insertListing("chk-d");
    const s = await startCheckoutSession(listing.id);
    const launched = await transitionCheckout(s.id, "launched");
    expect(launched.status).toBe("launched");
    expect(launched.launchedAt).not.toBeNull();
    expect(launched.decidedAt).toBeNull();

    const done = await transitionCheckout(s.id, "completed", { notes: "bought" });
    expect(done.status).toBe("completed");
    expect(done.decidedAt).not.toBeNull();
    expect(done.notes).toBe("bought");
  });

  it("can be abandoned", async () => {
    const listing = await insertListing("chk-e");
    const s = await startCheckoutSession(listing.id);
    const gone = await transitionCheckout(s.id, "abandoned");
    expect(gone.status).toBe("abandoned");
    expect(gone.decidedAt).not.toBeNull();
  });
});
