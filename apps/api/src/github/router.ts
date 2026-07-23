import { Router } from "express";
import { fetchPublicRepos, GitHubApiError, GitHubUserNotFoundError } from "./githubRepoService.js";

export interface GitHubRouterConfig {
  githubToken: string;
}

export function createGitHubRouter(config: GitHubRouterConfig): Router {
  const router = Router();

  router.get("/repos/:username", async (req, res) => {
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
  });

  return router;
}
