import type { RoleTemplate } from "@/role-templates/fields";

// Mirrors apps/api/src/featuredProjects/types.ts.
export const OUTCOME_LINE_MAX_LENGTH = 160;
export const TITLE_MAX_LENGTH = 120;
export const CASE_STUDY_MAX_LENGTH = 2000;

export type FeaturedProjectSourceType = "github_repo" | "manual";

export interface FeaturedProject {
  id: string;
  sourceType: FeaturedProjectSourceType;
  cachedRepoId: string | null;
  title: string;
  outcomeLine: string;
  caseStudy: string | null;
  roleSpecificFields: Record<string, unknown>;
  displayOrder: number;
}

export interface FeaturedProjectsData {
  roleTemplate: RoleTemplate | null;
  githubUsername: string | null;
  projects: FeaturedProject[];
}

// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

const EMPTY: FeaturedProjectsData = { roleTemplate: null, githubUsername: null, projects: [] };

/**
 * Fetches the signed-in candidate's Tier 2 featured projects, their
 * role_template (which drives the role-specific form fields), and connected
 * github_username, forwarding the Pulse session cookie. Returns empties if
 * there's no session or the request fails — a candidate with no projects yet
 * is a normal, renderable state.
 */
export async function fetchFeaturedProjects(
  sessionCookieValue: string | undefined,
): Promise<FeaturedProjectsData> {
  if (!sessionCookieValue) {
    return EMPTY;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const response = await fetch(`${apiUrl}/featured-projects`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionCookieValue}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return EMPTY;
  }

  return (await response.json()) as FeaturedProjectsData;
}
