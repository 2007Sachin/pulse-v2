import { Router } from "express";
import type { Pool } from "pg";

export interface PortfolioRouterConfig {
  pool: Pool;
}

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

// Public portfolio page (T3.2): unauthenticated GET by portfolio_slug. Only
// published portfolios are servable here — a draft in progress isn't
// publicly reachable at its eventual URL until the publish flow (T3.4) flips
// portfolio_status. Whether the slug doesn't exist or just isn't published
// yet, this returns the same 404 rather than leaking which is the case.
export function createPortfolioRouter(config: PortfolioRouterConfig): Router {
  const router = Router();

  router.get("/:slug", async (req, res) => {
    const { slug } = req.params;

    try {
      const userResult = await config.pool.query<{
        id: string;
        name: string;
        role_template: string;
        portfolio_status: string;
      }>("select id, name, role_template, portfolio_status from users where portfolio_slug = $1", [
        slug,
      ]);

      const userRow = userResult.rows[0];
      if (!userRow || userRow.portfolio_status !== "published") {
        res.status(404).json({ error: "portfolio not found" });
        return;
      }

      const [credentialsResult, projectsResult, narrativeResult] = await Promise.all([
        config.pool.query<VerifiedCredentialRow>(
          `select id, credential_type, title, score, summary, issued_at
           from verified_credentials
           where user_id = $1
           order by issued_at desc`,
          [userRow.id],
        ),
        config.pool.query<FeaturedProjectRow>(
          `select id, source_type, cached_repo_id, title, outcome_line, case_study,
                  role_specific_fields, display_order
           from featured_projects
           where user_id = $1
           order by display_order asc`,
          [userRow.id],
        ),
        config.pool.query<{ bio: string | null; career_intent: string | null }>(
          "select bio, career_intent from narrative where user_id = $1",
          [userRow.id],
        ),
      ]);

      const narrativeRow = narrativeResult.rows[0];

      res.json({
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
      });
    } catch (error) {
      console.error(`failed to load public portfolio for slug ${slug}`, error);
      res.status(500).json({ error: "internal error loading portfolio" });
    }
  });

  return router;
}
