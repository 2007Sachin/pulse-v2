import type { Request } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { requireAuth } from "../auth/middleware.js";
import { fetchPublicRepos, GitHubApiError, GitHubUserNotFoundError } from "./githubRepoService.js";

export interface GitHubRouterConfig {
  githubToken: string;
  pool: Pool;
  sessionSecret: string;
}

// Unauthenticated endpoint proxying to GitHub using Pulse's own shared
// server token (see ARCHITECTURE.md §2) — rate-limited per client IP so a
// single caller can't exhaust Pulse's GitHub API rate-limit budget.
const publicRepoLookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createGitHubRouter(config: GitHubRouterConfig): Router {
  const router = Router();

  router.get(
    "/repos/:username",
    publicRepoLookupLimiter,
    async (req: Request<{ username: string }>, res) => {
      const { username } = req.params;

      try {
        const repos = await fetchPublicRepos(username, { githubToken: config.githubToken });
        res.json({ repos });
      } catch (error) {
        if (error instanceof GitHubUserNotFoundError) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error instanceof GitHubApiError) {
          res.status(502).json({ error: error.message });
          return;
        }
        throw error;
      }
    },
  );

  // Connect step (T2.3): confirms the username resolves to a real GitHub
  // user via T1.3's fetch service, then saves it onto the candidate's
  // `users` row so github-sync-worker (T1.4) picks it up going forward.
  router.put("/username", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const username: unknown = req.body?.username;
    if (typeof username !== "string" || username.trim().length === 0) {
      res.status(400).json({ error: "username is required" });
      return;
    }

    let repos;
    try {
      repos = await fetchPublicRepos(username, { githubToken: config.githubToken });
    } catch (error) {
      if (error instanceof GitHubUserNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof GitHubApiError) {
        res.status(502).json({ error: error.message });
        return;
      }
      throw error;
    }

    await config.pool.query(
      "update users set github_username = $1, updated_at = now() where pathwisse_user_id = $2",
      [username, pathwisseUserId],
    );

    res.json({ username, repos });
  });

  return router;
}
