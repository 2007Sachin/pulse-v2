import { describe, expect, it } from "vitest";
import {
  OUTCOME_LINE_MAX_LENGTH,
  parseFeaturedProjectInput,
  TITLE_MAX_LENGTH,
} from "./types.js";

const manualBody = {
  sourceType: "manual",
  title: "Weekend budgeting app",
  outcomeLine: "Cut my own overspend by 20% in two months.",
  caseStudy: "A longer write-up.",
  roleSpecificFields: { what_you_built: "A budgeting app", outcome: "Saved money" },
};

const githubBody = {
  sourceType: "github_repo",
  title: "pulse-v2",
  outcomeLine: "Shipped a portfolio builder used by 100 candidates.",
  roleSpecificFields: { tech_stack: ["TypeScript", "Next.js"] },
  repo: {
    repoName: "pulse-v2",
    repoUrl: "https://github.com/octocat/pulse-v2",
    description: "A portfolio app",
    primaryLanguage: "TypeScript",
    stars: 42,
    lastUpdatedAt: "2026-01-15T10:00:00Z",
  },
};

describe("parseFeaturedProjectInput", () => {
  it("parses a valid manual project", () => {
    const result = parseFeaturedProjectInput(manualBody);
    expect(typeof result).toBe("object");
    if (typeof result === "string") return;
    expect(result.sourceType).toBe("manual");
    expect(result.title).toBe("Weekend budgeting app");
    expect(result.caseStudy).toBe("A longer write-up.");
    expect(result.repo).toBeNull();
    expect(result.roleSpecificFields).toEqual({
      what_you_built: "A budgeting app",
      outcome: "Saved money",
    });
  });

  it("parses a valid github_repo project and keeps the repo", () => {
    const result = parseFeaturedProjectInput(githubBody);
    expect(typeof result).toBe("object");
    if (typeof result === "string") return;
    expect(result.sourceType).toBe("github_repo");
    expect(result.repo?.repoName).toBe("pulse-v2");
    expect(result.repo?.stars).toBe(42);
  });

  it("rejects a non-object body", () => {
    expect(typeof parseFeaturedProjectInput("nope")).toBe("string");
    expect(typeof parseFeaturedProjectInput(null)).toBe("string");
    expect(typeof parseFeaturedProjectInput([1])).toBe("string");
  });

  it("rejects an unknown sourceType", () => {
    expect(typeof parseFeaturedProjectInput({ ...manualBody, sourceType: "twitter" })).toBe("string");
  });

  it("requires a title", () => {
    const { title: _title, ...rest } = manualBody;
    expect(typeof parseFeaturedProjectInput({ ...rest, title: "   " })).toBe("string");
    expect(typeof parseFeaturedProjectInput(rest)).toBe("string");
  });

  it("requires a non-empty outcomeLine", () => {
    expect(typeof parseFeaturedProjectInput({ ...manualBody, outcomeLine: "" })).toBe("string");
  });

  it("rejects a multi-line outcomeLine", () => {
    const result = parseFeaturedProjectInput({ ...manualBody, outcomeLine: "line one\nline two" });
    expect(typeof result).toBe("string");
  });

  it("rejects an over-length outcomeLine", () => {
    const tooLong = "x".repeat(OUTCOME_LINE_MAX_LENGTH + 1);
    expect(typeof parseFeaturedProjectInput({ ...manualBody, outcomeLine: tooLong })).toBe("string");
  });

  it("rejects an over-length title", () => {
    const tooLong = "x".repeat(TITLE_MAX_LENGTH + 1);
    expect(typeof parseFeaturedProjectInput({ ...manualBody, title: tooLong })).toBe("string");
  });

  it("normalizes an empty caseStudy to null and defaults roleSpecificFields", () => {
    const result = parseFeaturedProjectInput({
      sourceType: "manual",
      title: "Thing",
      outcomeLine: "Did the thing.",
      caseStudy: "   ",
    });
    expect(typeof result).toBe("object");
    if (typeof result === "string") return;
    expect(result.caseStudy).toBeNull();
    expect(result.roleSpecificFields).toEqual({});
  });

  it("requires a valid repo when sourceType is github_repo", () => {
    const { repo: _repo, ...rest } = githubBody;
    expect(typeof parseFeaturedProjectInput(rest)).toBe("string");
    expect(typeof parseFeaturedProjectInput({ ...rest, repo: { repoUrl: "x" } })).toBe("string");
  });

  it("rejects a non-object roleSpecificFields", () => {
    expect(typeof parseFeaturedProjectInput({ ...manualBody, roleSpecificFields: ["a"] })).toBe(
      "string",
    );
  });
});
