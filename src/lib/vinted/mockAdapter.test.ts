import { describe, expect, it } from "vitest";
import { MockVintedAdapter } from "./mockAdapter";

describe("MockVintedAdapter", () => {
  const adapter = new MockVintedAdapter();

  it("reports source as mock", () => {
    expect(adapter.source).toBe("mock");
  });

  it("returns listings with required fields and the mock source", async () => {
    const { listings, source } = await adapter.fetchListings({ keywords: "jacket" });
    expect(source).toBe("mock");
    expect(listings.length).toBeGreaterThan(0);
    for (const l of listings) {
      expect(l.vintedId).toBeTruthy();
      expect(l.title).toBeTruthy();
      expect(typeof l.price).toBe("number");
      expect(l.url).toContain("vinted.com");
      expect(l.totalCost).toBeGreaterThanOrEqual(l.price);
    }
  });

  it("respects maxPrice at source", async () => {
    const { listings } = await adapter.fetchListings({ maxPrice: 20 });
    for (const l of listings) expect(l.price).toBeLessThanOrEqual(20);
  });

  it("honors brand when provided", async () => {
    const { listings } = await adapter.fetchListings({ brand: "Nike" });
    for (const l of listings) expect(l.brand).toBe("Nike");
  });
});
