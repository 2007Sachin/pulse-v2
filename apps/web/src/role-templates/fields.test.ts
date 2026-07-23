import { describe, expect, it } from "vitest";
import { getProjectCardFields, isRoleTemplate, type RoleTemplate } from "./fields.js";

const ALL_ROLE_TEMPLATES: RoleTemplate[] = [
  "dev",
  "design",
  "marketing",
  "product",
  "data",
  "early_career",
];

describe("getProjectCardFields", () => {
  it("returns a non-empty field layout for every role template in ARCHITECTURE.md §5", () => {
    for (const roleTemplate of ALL_ROLE_TEMPLATES) {
      const fields = getProjectCardFields(roleTemplate);
      expect(fields.length).toBeGreaterThan(0);
    }
  });

  it("matches the dev template's fields from ARCHITECTURE.md §5", () => {
    const keys = getProjectCardFields("dev").map((f) => f.key);
    expect(keys).toEqual(["repo_link", "tech_stack", "metric", "demo_link"]);
  });

  it("matches the design template's fields from ARCHITECTURE.md §5", () => {
    const keys = getProjectCardFields("design").map((f) => f.key);
    expect(keys).toEqual(["process_shots", "before_after", "figma_link", "problem_statement"]);
  });

  it("matches the marketing template's fields from ARCHITECTURE.md §5", () => {
    const keys = getProjectCardFields("marketing").map((f) => f.key);
    expect(keys).toEqual(["campaign_name", "channel", "metric", "before_after"]);
  });

  it("matches the product template's problem -> decision -> outcome trail", () => {
    const keys = getProjectCardFields("product").map((f) => f.key);
    expect(keys).toEqual(["problem", "decision", "outcome"]);
  });

  it("matches the data template's fields from ARCHITECTURE.md §5", () => {
    const keys = getProjectCardFields("data").map((f) => f.key);
    expect(keys).toEqual(["dataset_or_tool", "question", "recommendation"]);
  });

  it("matches the early_career fallback's generic fields", () => {
    const keys = getProjectCardFields("early_career").map((f) => f.key);
    expect(keys).toEqual(["what_you_built", "what_you_learned", "outcome"]);
  });

  it("gives each role template a distinct field layout", () => {
    const layouts = ALL_ROLE_TEMPLATES.map((role) =>
      getProjectCardFields(role)
        .map((f) => f.key)
        .join(","),
    );
    expect(new Set(layouts).size).toBe(ALL_ROLE_TEMPLATES.length);
  });
});

describe("isRoleTemplate", () => {
  it("accepts all known role templates", () => {
    for (const roleTemplate of ALL_ROLE_TEMPLATES) {
      expect(isRoleTemplate(roleTemplate)).toBe(true);
    }
  });

  it("rejects unknown values", () => {
    expect(isRoleTemplate("recruiter")).toBe(false);
    expect(isRoleTemplate("")).toBe(false);
  });
});
