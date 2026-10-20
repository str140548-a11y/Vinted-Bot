import { describe, expect, it } from "vitest";
import { evaluateMatch, type SearchCriteria } from "./matching";
import type { RawListing } from "./vinted/types";

const base: RawListing = {
  vintedId: "1",
  title: "The North Face Nuptse puffer jacket",
  price: 35,
  currency: "EUR",
  serviceFee: 2,
  shippingFee: 3,
  totalCost: 40,
  brand: "The North Face",
  size: "M",
  condition: "very_good",
  imageUrl: "x",
  url: "https://vinted.com/items/1",
  sellerName: "seller",
  sellerRating: 4.6,
};

const emptyCriteria: SearchCriteria = {
  preferredBrands: [],
  excludedBrands: [],
  excludedKeywords: [],
};

describe("evaluateMatch", () => {
  it("matches when no criteria are set", () => {
    expect(evaluateMatch(base, emptyCriteria).matched).toBe(true);
  });

  it("requires all keywords present", () => {
    expect(evaluateMatch(base, { ...emptyCriteria, keywords: "puffer jacket" }).matched).toBe(true);
    expect(evaluateMatch(base, { ...emptyCriteria, keywords: "fleece" }).matched).toBe(false);
  });

  it("rejects excluded keywords", () => {
    const r = evaluateMatch(base, { ...emptyCriteria, excludedKeywords: ["puffer"] });
    expect(r.matched).toBe(false);
    expect(r.reason).toContain("Excluded keyword");
  });

  it("rejects excluded brands", () => {
    const r = evaluateMatch(base, { ...emptyCriteria, excludedBrands: ["north face"] });
    expect(r.matched).toBe(false);
  });

  it("enforces brand filter case-insensitively", () => {
    expect(evaluateMatch(base, { ...emptyCriteria, brand: "north face" }).matched).toBe(true);
    expect(evaluateMatch(base, { ...emptyCriteria, brand: "adidas" }).matched).toBe(false);
  });

  it("enforces price bounds", () => {
    expect(evaluateMatch(base, { ...emptyCriteria, maxPrice: 30 }).matched).toBe(false);
    expect(evaluateMatch(base, { ...emptyCriteria, maxPrice: 40 }).matched).toBe(true);
    expect(evaluateMatch(base, { ...emptyCriteria, minPrice: 50 }).matched).toBe(false);
  });

  it("enforces max total cost only when total is known", () => {
    expect(evaluateMatch(base, { ...emptyCriteria, maxTotalCost: 38 }).matched).toBe(false);
    expect(evaluateMatch(base, { ...emptyCriteria, maxTotalCost: 45 }).matched).toBe(true);
    // When total unknown, maxTotalCost should not reject.
    const noTotal = { ...base, totalCost: null };
    expect(evaluateMatch(noTotal, { ...emptyCriteria, maxTotalCost: 1 }).matched).toBe(true);
  });

  it("enforces seller rating bounds when known", () => {
    expect(evaluateMatch(base, { ...emptyCriteria, minSellerRating: 4.7 }).matched).toBe(false);
    expect(evaluateMatch(base, { ...emptyCriteria, minSellerRating: 4.0 }).matched).toBe(true);
  });

  it("flags priority deals below threshold", () => {
    // ceiling 40, 30% off => threshold 28; price 35 is NOT priority.
    expect(
      evaluateMatch(base, { ...emptyCriteria, maxTotalCost: 40, priorityDealPct: 0.3 }).priority,
    ).toBe(false);
    // ceiling 60 total, 30% off => threshold 42; total 40 IS priority.
    expect(
      evaluateMatch(base, { ...emptyCriteria, maxTotalCost: 60, priorityDealPct: 0.3 }).priority,
    ).toBe(true);
  });

  it("enforces condition and size", () => {
    expect(evaluateMatch(base, { ...emptyCriteria, condition: "good" }).matched).toBe(false);
    expect(evaluateMatch(base, { ...emptyCriteria, size: "L" }).matched).toBe(false);
    expect(evaluateMatch(base, { ...emptyCriteria, size: "M" }).matched).toBe(true);
  });
});
