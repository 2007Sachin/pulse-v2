// Tier 2 — Proof of Work (ARCHITECTURE.md §4): candidate-authored project
// cards, one row per featured project in `featured_projects` (SCHEMA.md).
// The candidate authors the title, outcome line, optional case study, and a
// bag of role-specific fields whose shape is driven by their role_template
// (ARCHITECTURE.md §5) — validated loosely here as a JSON object, since the
// exact keys vary by role and are described by the T3.1 role template engine.

export type FeaturedProjectSourceType = "github_repo" | "manual";

// outcome_line is "candidate-authored, one line, required" (SCHEMA.md).
export const OUTCOME_LINE_MAX_LENGTH = 160;
export const TITLE_MAX_LENGTH = 120;
export const CASE_STUDY_MAX_LENGTH = 2000;

export interface NormalizedRepoInput {
  repoName: string;
  repoUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  lastUpdatedAt: string | null;
}

export interface ParsedFeaturedProjectInput {
  sourceType: FeaturedProjectSourceType;
  title: string;
  outcomeLine: string;
  caseStudy: string | null;
  roleSpecificFields: Record<string, unknown>;
  /** Present only when sourceType === "github_repo": the repo to link/cache. */
  repo: NormalizedRepoInput | null;
}

function parseRepo(value: unknown): NormalizedRepoInput | string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "repo is required for a github_repo project";
  }

  const r = value as Record<string, unknown>;

  if (typeof r.repoName !== "string" || r.repoName.trim().length === 0) {
    return "repo.repoName is required";
  }
  if (typeof r.repoUrl !== "string" || r.repoUrl.trim().length === 0) {
    return "repo.repoUrl is required";
  }
  if (r.description !== undefined && r.description !== null && typeof r.description !== "string") {
    return "repo.description must be a string if present";
  }
  if (
    r.primaryLanguage !== undefined &&
    r.primaryLanguage !== null &&
    typeof r.primaryLanguage !== "string"
  ) {
    return "repo.primaryLanguage must be a string if present";
  }
  if (r.stars !== undefined && r.stars !== null && typeof r.stars !== "number") {
    return "repo.stars must be a number if present";
  }
  if (
    r.lastUpdatedAt !== undefined &&
    r.lastUpdatedAt !== null &&
    typeof r.lastUpdatedAt !== "string"
  ) {
    return "repo.lastUpdatedAt must be a string if present";
  }

  return {
    repoName: r.repoName,
    repoUrl: r.repoUrl,
    description: typeof r.description === "string" ? r.description : null,
    primaryLanguage: typeof r.primaryLanguage === "string" ? r.primaryLanguage : null,
    stars: typeof r.stars === "number" ? r.stars : 0,
    lastUpdatedAt: typeof r.lastUpdatedAt === "string" ? r.lastUpdatedAt : null,
  };
}

/**
 * Validates and normalizes a featured-project submission. Returns the parsed
 * input, or an error string describing what's wrong.
 */
export function parseFeaturedProjectInput(body: unknown): ParsedFeaturedProjectInput | string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;

  if (b.sourceType !== "github_repo" && b.sourceType !== "manual") {
    return "sourceType must be 'github_repo' or 'manual'";
  }

  if (typeof b.title !== "string" || b.title.trim().length === 0) {
    return "title is required";
  }
  const title = b.title.trim();
  if (title.length > TITLE_MAX_LENGTH) {
    return `title must be ${TITLE_MAX_LENGTH} characters or fewer`;
  }

  if (typeof b.outcomeLine !== "string" || b.outcomeLine.trim().length === 0) {
    return "outcomeLine is required";
  }
  const outcomeLine = b.outcomeLine.trim();
  if (/[\r\n]/.test(outcomeLine)) {
    return "outcomeLine must be a single line";
  }
  if (outcomeLine.length > OUTCOME_LINE_MAX_LENGTH) {
    return `outcomeLine must be ${OUTCOME_LINE_MAX_LENGTH} characters or fewer`;
  }

  if (b.caseStudy !== undefined && b.caseStudy !== null && typeof b.caseStudy !== "string") {
    return "caseStudy must be a string if present";
  }
  const caseStudyRaw = typeof b.caseStudy === "string" ? b.caseStudy.trim() : "";
  if (caseStudyRaw.length > CASE_STUDY_MAX_LENGTH) {
    return `caseStudy must be ${CASE_STUDY_MAX_LENGTH} characters or fewer`;
  }
  const caseStudy = caseStudyRaw === "" ? null : caseStudyRaw;

  let roleSpecificFields: Record<string, unknown> = {};
  if (b.roleSpecificFields !== undefined && b.roleSpecificFields !== null) {
    if (
      typeof b.roleSpecificFields !== "object" ||
      Array.isArray(b.roleSpecificFields)
    ) {
      return "roleSpecificFields must be a JSON object if present";
    }
    roleSpecificFields = b.roleSpecificFields as Record<string, unknown>;
  }

  let repo: NormalizedRepoInput | null = null;
  if (b.sourceType === "github_repo") {
    const parsedRepo = parseRepo(b.repo);
    if (typeof parsedRepo === "string") {
      return parsedRepo;
    }
    repo = parsedRepo;
  }

  return { sourceType: b.sourceType, title, outcomeLine, caseStudy, roleSpecificFields, repo };
}
