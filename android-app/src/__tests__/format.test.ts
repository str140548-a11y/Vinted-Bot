import { conditionLabel, mmss, money, parseJsonArray, relativeTime, toDate } from "../format";

describe("format helpers", () => {
  it("formats money with currency", () => {
    expect(money(null)).toBe("—");
    expect(money(12.5, "EUR")).toMatch(/12\.50|12,50/);
  });

  it("mmss pads correctly and clamps negatives", () => {
    expect(mmss(900)).toBe("15:00");
    expect(mmss(65)).toBe("01:05");
    expect(mmss(-5)).toBe("00:00");
  });

  it("conditionLabel maps known values and passes through unknown", () => {
    expect(conditionLabel("very_good")).toBe("Very good");
    expect(conditionLabel("mystery")).toBe("mystery");
    expect(conditionLabel(null)).toBe("—");
  });

  it("relativeTime handles nulls, seconds, minutes, hours, days", () => {
    const now = Date.now();
    expect(relativeTime(null, now)).toBe("never");
    expect(relativeTime(now - 5000, now)).toBe("5s ago");
    expect(relativeTime(now - 120000, now)).toBe("2m ago");
    expect(relativeTime(now - 3 * 3600_000, now)).toBe("3h ago");
    expect(relativeTime(now - 2 * 86400_000, now)).toBe("2d ago");
  });

  it("toDate parses epoch and iso, rejects null and garbage", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate("not-a-date")).toBeNull();
    expect(toDate(0)?.getUTCFullYear()).toBe(1970); // 0 is a valid epoch
    expect(toDate("2024-01-01T00:00:00.000Z")?.getUTCFullYear()).toBe(2024);
  });

  it("parseJsonArray parses arrays and tolerates bad input", () => {
    expect(parseJsonArray('["a","b"]')).toEqual(["a", "b"]);
    expect(parseJsonArray("[]")).toEqual([]);
    expect(parseJsonArray("not json")).toEqual([]);
    expect(parseJsonArray(null)).toEqual([]);
  });
});
