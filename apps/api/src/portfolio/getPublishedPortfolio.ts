import type { Pool } from "pg";

interface VerifiedCredentialRow {
  id: string;
  credential_type: string;
  title: string;
  score: string | null;
  summary: string | null;
  issued_at: Date;
}

interface FeaturedProjectRow {
  id: string;
  source_type: string;
  cached_repo_id: string | null;
  title: string;
  outcome_line: string;
  case_study: string | null;
  role_specific_fields: Record<string, unknown>;
  display_order: number;
}

export interface PublishedPortfolio {
  candidateName: string;
  roleTemplate: string;
  credentials: {
    id: string;
    credentialType: string;
    title: string;
    score: number | null;
    summary: string | null;
    issuedAt: Date;
  }[];
  projects: {
    id: string;
    sourceType: string;
    cachedRepoId: string | null;
    title: string;
    outcomeLine: string;
    caseStudy: string | null;
    roleSpecificFields: Record<string, unknown>;
    displayOrder: number;
  }[];
  narrative: {
    bio: string | null;
    careerIntent: string | null;
  };
}

/**
 * Loads a portfolio by its public slug — but only if it's actually
 * published. Returns null both when the slug doesn't exist AND when it
 * belongs to a draft, deliberately indistinguishable to callers: a draft
 * in progress must not be reachable at its eventual public URL before the
 * publish flow (T3.4) flips `portfolio_status`. This is the one gate the
 * public route (T3.2) depends on — see portfolio.test.ts.
 */
export async function getPublishedPortfolio(
  pool: Pool,
  slug: string,
): Promise<PublishedPortfolio | null> {
  const userResult = await pool.query<{
    id: string;
    name: string;
    role_template: string;
    portfolio_status: string;
  }>("select id, name, role_template, portfolio_status from users where portfolio_slug = $1", [
    slug,
  ]);

  const userRow = userResult.rows[0];
  if (!userRow || userRow.portfolio_status !== "published") {
    return null;
  }

  const [credentialsResult, projectsResult, narrativeResult] = await Promise.all([
    pool.query<VerifiedCredentialRow>(
      `select id, credential_type, title, score, summary, issued_at
       from verified_credentials
       where user_id = $1
       order by issued_at desc`,
      [userRow.id],
    ),
    pool.query<FeaturedProjectRow>(
      `select id, source_type, cached_repo_id, title, outcome_line, case_study,
              role_specific_fields, display_order
       from featured_projects
       where user_id = $1
       order by display_order asc`,
      [userRow.id],
    ),
    pool.query<{ bio: string | null; career_intent: string | null }>(
      "select bio, career_intent from narrative where user_id = $1",
      [userRow.id],
    ),
  ]);

  const narrativeRow = narrativeResult.rows[0];

  return {
    candidateName: userRow.name,
    roleTemplate: userRow.role_template,
    credentials: credentialsResult.rows.map((row) => ({
      id: row.id,
      credentialType: row.credential_type,
      title: row.title,
      score: row.score === null ? null : Number(row.score),
      summary: row.summary,
      issuedAt: row.issued_at,
    })),
    projects: projectsResult.rows.map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      cachedRepoId: row.cached_repo_id,
      title: row.title,
      outcomeLine: row.outcome_line,
      caseStudy: row.case_study,
      roleSpecificFields: row.role_specific_fields,
      displayOrder: row.display_order,
    })),
    narrative: {
      bio: narrativeRow?.bio ?? null,
      careerIntent: narrativeRow?.career_intent ?? null,
    },
  };
}
