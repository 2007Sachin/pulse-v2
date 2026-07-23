import { Router } from "express";
import type { Pool } from "pg";
import { requireAuth } from "../auth/middleware.js";
import { parseFeaturedProjectInput } from "./types.js";

export interface FeaturedProjectsRouterConfig {
  pool: Pool;
  sessionSecret: string;
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

function mapProjectRow(row: FeaturedProjectRow) {
  return {
    id: row.id,
    sourceType: row.source_type,
    cachedRepoId: row.cached_repo_id,
    title: row.title,
    outcomeLine: row.outcome_line,
    caseStudy: row.case_study,
    roleSpecificFields: row.role_specific_fields,
    displayOrder: row.display_order,
  };
}

// Tier 2 — Proof of Work featured project editor (T2.4). Read + create the
// candidate's featured_projects rows. The GET also returns the candidate's
// role_template (so the client can render the right role-specific form
// fields, per ARCHITECTURE.md §5) and github_username (so the editor can
// offer the connected repos as project sources, per T2.3).
export function createFeaturedProjectsRouter(config: FeaturedProjectsRouterConfig): Router {
  const router = Router();

  router.get("/", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const userResult = await config.pool.query<{
      id: string;
      role_template: string;
      github_username: string | null;
    }>("select id, role_template, github_username from users where pathwisse_user_id = $1", [
      pathwisseUserId,
    ]);

    const userRow = userResult.rows[0];
    if (!userRow) {
      res.json({ roleTemplate: null, githubUsername: null, projects: [] });
      return;
    }

    const projectsResult = await config.pool.query<FeaturedProjectRow>(
      `select id, source_type, cached_repo_id, title, outcome_line, case_study,
              role_specific_fields, display_order
       from featured_projects
       where user_id = $1
       order by display_order asc`,
      [userRow.id],
    );

    res.json({
      roleTemplate: userRow.role_template,
      githubUsername: userRow.github_username,
      projects: projectsResult.rows.map(mapProjectRow),
    });
  });

  router.post("/", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const parsed = parseFeaturedProjectInput(req.body);
    if (typeof parsed === "string") {
      res.status(400).json({ error: parsed });
      return;
    }

    const userResult = await config.pool.query<{ id: string }>(
      "select id from users where pathwisse_user_id = $1",
      [pathwisseUserId],
    );

    const userRow = userResult.rows[0];
    if (!userRow) {
      res.status(404).json({ error: "portfolio not found yet" });
      return;
    }
    const userId = userRow.id;

    const client = await config.pool.connect();
    try {
      await client.query("begin");

      // For a github_repo project, ensure a cached_repos row exists to link to
      // (github-sync-worker may not have run yet for a freshly connected user),
      // reusing the same unique key it upserts on (migration 0002).
      let cachedRepoId: string | null = null;
      if (parsed.sourceType === "github_repo" && parsed.repo) {
        const repoResult = await client.query<{ id: string }>(
          `insert into cached_repos
             (user_id, repo_name, repo_url, description, primary_language, stars, last_updated_at, fetched_at)
           values ($1, $2, $3, $4, $5, $6, $7, now())
           on conflict (user_id, repo_name) do update set
             repo_url = excluded.repo_url,
             description = excluded.description,
             primary_language = excluded.primary_language,
             stars = excluded.stars,
             last_updated_at = excluded.last_updated_at,
             fetched_at = now()
           returning id`,
          [
            userId,
            parsed.repo.repoName,
            parsed.repo.repoUrl,
            parsed.repo.description,
            parsed.repo.primaryLanguage,
            parsed.repo.stars,
            parsed.repo.lastUpdatedAt,
          ],
        );
        cachedRepoId = repoResult.rows[0]?.id ?? null;
      }

      // Append to the end: next display_order is one past the current max for
      // this user (gapless-enough; reordering is out of scope for T2.4).
      const insertResult = await client.query<FeaturedProjectRow>(
        `insert into featured_projects
           (user_id, source_type, cached_repo_id, title, outcome_line, case_study,
            role_specific_fields, display_order)
         values (
           $1, $2, $3, $4, $5, $6, $7,
           (select coalesce(max(display_order), -1) + 1 from featured_projects where user_id = $1)
         )
         returning id, source_type, cached_repo_id, title, outcome_line, case_study,
                   role_specific_fields, display_order`,
        [
          userId,
          parsed.sourceType,
          cachedRepoId,
          parsed.title,
          parsed.outcomeLine,
          parsed.caseStudy,
          JSON.stringify(parsed.roleSpecificFields),
        ],
      );

      await client.query("commit");

      const createdRow = insertResult.rows[0];
      if (!createdRow) {
        throw new Error("featured_projects insert did not return a row");
      }
      res.status(201).json(mapProjectRow(createdRow));
    } catch (error) {
      await client.query("rollback");
      console.error("failed to create featured project", error);
      res.status(500).json({ error: "internal error creating featured project" });
    } finally {
      client.release();
    }
  });

  return router;
}
