import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "vinted-expopush-test-"));
const dbPath = join(dir, "test.db");
process.env.DATABASE_URL = `file:${dbPath}`;

let db: typeof import("@/db").db;
let schema: typeof import("@/db").schema;
let sendExpoPush: typeof import("@/lib/expoPush").sendExpoPush;
let registerExpoToken: typeof import("@/lib/expoPush").registerExpoToken;

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
  const m = await import("@/lib/expoPush");
  sendExpoPush = m.sendExpoPush;
  registerExpoToken = m.registerExpoToken;
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));
beforeEach(async () => {
  await db.delete(schema.expoPushTokens);
});
afterEach(() => vi.restoreAllMocks());

describe("expo push", () => {
  it("registers a token idempotently (upsert on conflict)", async () => {
    await registerExpoToken("ExponentPushToken[abc]", "android", "Pixel");
    await registerExpoToken("ExponentPushToken[abc]", "android", "Pixel 2");
    const rows = await db.select().from(schema.expoPushTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0].deviceName).toBe("Pixel 2");
  });

  it("returns {sent:0} when there are no tokens and does not call fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await sendExpoPush({ title: "hi", body: "there" });
    expect(res).toEqual({ sent: 0, pruned: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends to registered tokens and counts ok tickets", async () => {
    await registerExpoToken("ExponentPushToken[t1]", "android");
    await registerExpoToken("ExponentPushToken[t2]", "android");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ status: "ok", id: "1" }, { status: "ok", id: "2" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const res = await sendExpoPush({ title: "Match", body: "New item", url: "https://x", priority: true });
    expect(res.sent).toBe(2);
    expect(res.pruned).toBe(0);
  });

  it("prunes tokens Expo reports as DeviceNotRegistered", async () => {
    await registerExpoToken("ExponentPushToken[dead]", "android");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ data: [{ status: "error", message: "x", details: { error: "DeviceNotRegistered" } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const res = await sendExpoPush({ title: "t", body: "b" });
    expect(res.pruned).toBe(1);
    const rows = await db.select().from(schema.expoPushTokens);
    expect(rows).toHaveLength(0);
  });
});
