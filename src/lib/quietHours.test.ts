import { describe, expect, it } from "vitest";
import { isWithinQuietHours, parseHm } from "./quietHours";

function at(h: number, m = 0): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

describe("parseHm", () => {
  it("parses valid times", () => {
    expect(parseHm("08:30")).toBe(510);
    expect(parseHm("00:00")).toBe(0);
    expect(parseHm("23:59")).toBe(1439);
  });
  it("rejects invalid", () => {
    expect(parseHm("24:00")).toBeNull();
    expect(parseHm("8:30")).toBeNull();
    expect(parseHm("aa:bb")).toBeNull();
  });
});

describe("isWithinQuietHours", () => {
  it("returns false when not configured", () => {
    expect(isWithinQuietHours(null, null, at(3))).toBe(false);
    expect(isWithinQuietHours("22:00", null, at(23))).toBe(false);
  });

  it("handles a same-day window", () => {
    expect(isWithinQuietHours("09:00", "17:00", at(12))).toBe(true);
    expect(isWithinQuietHours("09:00", "17:00", at(8))).toBe(false);
    expect(isWithinQuietHours("09:00", "17:00", at(17))).toBe(false); // end exclusive
  });

  it("handles a window that wraps midnight", () => {
    expect(isWithinQuietHours("22:00", "08:00", at(23))).toBe(true);
    expect(isWithinQuietHours("22:00", "08:00", at(3))).toBe(true);
    expect(isWithinQuietHours("22:00", "08:00", at(9))).toBe(false);
    expect(isWithinQuietHours("22:00", "08:00", at(21))).toBe(false);
  });

  it("treats a zero-length window as never quiet", () => {
    expect(isWithinQuietHours("10:00", "10:00", at(10))).toBe(false);
  });
});
