import { getApiUrl } from "@/lib/apiUrl";
import type { VerifiedCredential } from "@/lib/credentials";
import type { FeaturedProject } from "@/lib/featuredProjects";
import type { Narrative } from "@/lib/narrative";
import type { RoleTemplate } from "@/role-templates/fields";

export interface PublicPortfolio {
  candidateName: string;
  roleTemplate: RoleTemplate | null;
  credentials: VerifiedCredential[];
  projects: FeaturedProject[];
  narrative: Narrative;
}

/**
 * Fetches a published portfolio by its public slug (SCHEMA.md
 * users.portfolio_slug) from the api service's unauthenticated
 * GET /portfolio/:slug. Returns null for a missing slug OR a draft
 * portfolio — the api intentionally responds with the same 404 for both,
 * so a draft-in-progress isn't publicly reachable at its eventual URL
 * (that flip happens at publish time, T3.4). Also returns null if the api
 * is unreachable entirely, rather than throwing: this is called from both
 * the public page and its OG image (T3.3), and neither should crash on a
 * transient network error — a slow/absent api should render "not found",
 * not a 500.
 */
export async function fetchPublicPortfolio(slug: string): Promise<PublicPortfolio | null> {
  const apiUrl = getApiUrl();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/portfolio/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PublicPortfolio;
}
