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
 * (that flip happens at publish time, T3.4).
 */
export async function fetchPublicPortfolio(slug: string): Promise<PublicPortfolio | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const response = await fetch(`${apiUrl}/portfolio/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PublicPortfolio;
}
