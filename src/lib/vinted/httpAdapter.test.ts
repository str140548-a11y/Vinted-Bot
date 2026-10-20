import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpVintedAdapter } from "./httpAdapter";
import { RateLimitError, AdapterError } from "./types";

const sampleResponse = {
  items: [
    {
      id: 123,
      title: "Nike hoodie",
      price: { amount: "25.0", currency_code: "GBP" },
      service_fee: { amount: "1.5" },
      total_item_price: { amount: "26.5" },
      brand_title: "Nike",
      size_title: "M",
      status: "very_good",
      url: "https://www.vinted.co.uk/items/123-nike-hoodie",
      photo: { url: "https://images1.vinted.net/x.jpg" },
      user: { login: "seller99", feedback_reputation: 0.98 },
      created_at_ts: 1_700_000_000,
    },
    { id: null }, // malformed — must be skipped
  ],
};

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("HttpVintedAdapter", () => {
  it("parses a valid response and skips malformed items", async () => {
    vi.stubGlobal("fetch", mockFetch(200, sampleResponse));
    const adapter = new HttpVintedAdapter();
    const { listings, source } = await adapter.fetchListings({ keywords: "hoodie" });
    expect(source).toBe("http");
    expect(listings).toHaveLength(1);
    const l = listings[0];
    expect(l.vintedId).toBe("123");
    expect(l.price).toBe(25);
    expect(l.currency).toBe("GBP");
    expect(l.serviceFee).toBe(1.5);
    expect(l.totalCost).toBe(26.5);
    expect(l.brand).toBe("Nike");
    expect(l.sellerName).toBe("seller99");
    expect(l.imageUrl).toContain("vinted.net");
  });

  it("throws RateLimitError on 429", async () => {
    vi.stubGlobal("fetch", mockFetch(429, ""));
    await expect(new HttpVintedAdapter().fetchListings({})).rejects.toBeInstanceOf(RateLimitError);
  });

  it("throws a helpful AdapterError on 403 (needs cookie)", async () => {
    vi.stubGlobal("fetch", mockFetch(403, ""));
    await expect(new HttpVintedAdapter().fetchListings({})).rejects.toBeInstanceOf(AdapterError);
  });

  it("returns empty list when response has no items array", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { foo: "bar" }));
    const { listings } = await new HttpVintedAdapter().fetchListings({});
    expect(listings).toEqual([]);
  });
});
