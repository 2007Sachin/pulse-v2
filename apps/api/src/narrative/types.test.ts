import { describe, expect, it } from "vitest";
import { BIO_MAX_LENGTH, CAREER_INTENT_MAX_LENGTH, parseNarrativeInput } from "./types.js";

describe("parseNarrativeInput", () => {
  it("parses a valid submission", () => {
    const result = parseNarrativeInput({ bio: "I build things.", careerIntent: "Frontend roles." });
    expect(result).toEqual({ bio: "I build things.", careerIntent: "Frontend roles." });
  });

  it("trims whitespace", () => {
    const result = parseNarrativeInput({ bio: "  hi  ", careerIntent: "  there  " });
    expect(result).toEqual({ bio: "hi", careerIntent: "there" });
  });

  it("normalizes empty strings to null", () => {
    const result = parseNarrativeInput({ bio: "  ", careerIntent: "" });
    expect(result).toEqual({ bio: null, careerIntent: null });
  });

  it("defaults missing fields to null", () => {
    expect(parseNarrativeInput({})).toEqual({ bio: null, careerIntent: null });
  });

  it("accepts explicit nulls", () => {
    expect(parseNarrativeInput({ bio: null, careerIntent: null })).toEqual({
      bio: null,
      careerIntent: null,
    });
  });

  it("rejects a non-object body", () => {
    expect(typeof parseNarrativeInput("nope")).toBe("string");
    expect(typeof parseNarrativeInput(null)).toBe("string");
    expect(typeof parseNarrativeInput([1, 2, 3])).toBe("string");
  });

  it("rejects a non-string bio", () => {
    expect(typeof parseNarrativeInput({ bio: 123 })).toBe("string");
  });

  it("rejects a non-string careerIntent", () => {
    expect(typeof parseNarrativeInput({ careerIntent: 123 })).toBe("string");
  });

  it("rejects a bio over the character limit", () => {
    const result = parseNarrativeInput({ bio: "a".repeat(BIO_MAX_LENGTH + 1) });
    expect(result).toBe(`bio must be ${BIO_MAX_LENGTH} characters or fewer`);
  });

  it("accepts a bio exactly at the character limit", () => {
    const bio = "a".repeat(BIO_MAX_LENGTH);
    expect(parseNarrativeInput({ bio })).toEqual({ bio, careerIntent: null });
  });

  it("rejects a careerIntent over the character limit", () => {
    const result = parseNarrativeInput({ careerIntent: "a".repeat(CAREER_INTENT_MAX_LENGTH + 1) });
    expect(result).toBe(`careerIntent must be ${CAREER_INTENT_MAX_LENGTH} characters or fewer`);
  });
});
