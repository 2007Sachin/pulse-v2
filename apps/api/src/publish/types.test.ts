import { describe, expect, it } from "vitest";
import { parsePublishRequest, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from "./types.js";

describe("parsePublishRequest", () => {
  it("parses a valid slug", () => {
    expect(parsePublishRequest({ slug: "aditi-rao" })).toEqual({ slug: "aditi-rao" });
  });

  it("trims and lowercases the slug", () => {
    expect(parsePublishRequest({ slug: "  Aditi-Rao  " })).toEqual({ slug: "aditi-rao" });
  });

  it("accepts a slug with numbers", () => {
    expect(parsePublishRequest({ slug: "aditi-rao-2" })).toEqual({ slug: "aditi-rao-2" });
  });

  it("rejects a missing slug", () => {
    expect(typeof parsePublishRequest({})).toBe("string");
  });

  it("rejects a non-string slug", () => {
    expect(typeof parsePublishRequest({ slug: 123 })).toBe("string");
  });

  it("rejects a blank slug", () => {
    expect(typeof parsePublishRequest({ slug: "   " })).toBe("string");
  });

  it("rejects a non-object body", () => {
    expect(typeof parsePublishRequest("nope")).toBe("string");
    expect(typeof parsePublishRequest(null)).toBe("string");
    expect(typeof parsePublishRequest([1, 2, 3])).toBe("string");
  });

  it("rejects a slug shorter than the minimum length", () => {
    const result = parsePublishRequest({ slug: "a".repeat(SLUG_MIN_LENGTH - 1) });
    expect(result).toBe(`slug must be between ${SLUG_MIN_LENGTH} and ${SLUG_MAX_LENGTH} characters`);
  });

  it("rejects a slug longer than the maximum length", () => {
    const result = parsePublishRequest({ slug: "a".repeat(SLUG_MAX_LENGTH + 1) });
    expect(result).toBe(`slug must be between ${SLUG_MIN_LENGTH} and ${SLUG_MAX_LENGTH} characters`);
  });

  it("rejects slugs with underscores, spaces, or symbols", () => {
    expect(typeof parsePublishRequest({ slug: "aditi_rao" })).toBe("string");
    expect(typeof parsePublishRequest({ slug: "aditi rao" })).toBe("string");
    expect(typeof parsePublishRequest({ slug: "aditi@rao" })).toBe("string");
  });

  it("rejects leading, trailing, or doubled hyphens", () => {
    expect(typeof parsePublishRequest({ slug: "-aditi-rao" })).toBe("string");
    expect(typeof parsePublishRequest({ slug: "aditi-rao-" })).toBe("string");
    expect(typeof parsePublishRequest({ slug: "aditi--rao" })).toBe("string");
  });
});
