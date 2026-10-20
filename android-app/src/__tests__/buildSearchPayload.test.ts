import { buildSearchPayload } from "../searchPayload";

const baseForm = {
  name: "  My search  ",
  keywords: " fleece ",
  brand: "The North Face",
  category: "",
  size: "M",
  minPrice: "",
  maxPrice: "40",
  maxTotalCost: "48",
  preferredBrands: "North Face, Patagonia",
  excludedKeywords: "kids, damaged",
  active: true,
  alertPriceDrops: true,
  notify: true,
};

describe("buildSearchPayload", () => {
  it("trims strings and converts empty to null", () => {
    const p = buildSearchPayload(baseForm);
    expect(p.name).toBe("My search");
    expect(p.keywords).toBe("fleece");
    expect(p.category).toBeNull();
    expect(p.minPrice).toBeNull();
  });

  it("parses numeric fields", () => {
    const p = buildSearchPayload(baseForm);
    expect(p.maxPrice).toBe(40);
    expect(p.maxTotalCost).toBe(48);
  });

  it("splits comma-separated arrays and drops blanks", () => {
    const p = buildSearchPayload({ ...baseForm, preferredBrands: "A, , B,", excludedKeywords: "" });
    expect(p.preferredBrands).toEqual(["A", "B"]);
    expect(p.excludedKeywords).toEqual([]);
  });

  it("preserves boolean flags", () => {
    const p = buildSearchPayload({ ...baseForm, active: false, notify: false });
    expect(p.active).toBe(false);
    expect(p.notify).toBe(false);
    expect(p.alertPriceDrops).toBe(true);
  });

  it("returns a non-finite-safe null for bad numbers", () => {
    const p = buildSearchPayload({ ...baseForm, maxPrice: "abc" });
    expect(p.maxPrice).toBeNull();
  });
});
