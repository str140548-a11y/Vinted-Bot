import { unwrap, ApiError } from "../api";

describe("unwrap (API envelope parser)", () => {
  it("returns data when ok", () => {
    expect(unwrap({ ok: true, data: { x: 1 } })).toEqual({ x: 1 });
  });

  it("throws ApiError with the server error message when not ok", () => {
    expect(() => unwrap({ ok: false, error: "Not found" }, 404)).toThrow(ApiError);
    try {
      unwrap({ ok: false, error: "Not found" }, 404);
    } catch (e) {
      expect((e as ApiError).message).toBe("Not found");
      expect((e as ApiError).status).toBe(404);
    }
  });

  it("appends field validation details when present", () => {
    try {
      unwrap(
        { ok: false, error: "Validation failed", details: { fieldErrors: { name: ["Required"] } } },
        422,
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ApiError).message).toContain("Validation failed");
      expect((e as ApiError).message).toContain("name: Required");
    }
  });

  it("throws on a malformed (non-object) response", () => {
    // @ts-expect-error intentionally malformed
    expect(() => unwrap(null, 500)).toThrow(ApiError);
  });
});
