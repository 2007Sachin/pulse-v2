import { Router } from "express";
import type { Pool } from "pg";
import { requireAuth } from "../auth/middleware.js";
import { publishPortfolio, SlugTakenError, unpublishPortfolio } from "./publishService.js";
import { parsePublishRequest } from "./types.js";

export interface PublishRouterConfig {
  pool: Pool;
  sessionSecret: string;
}

interface UserRow {
  id: string;
  portfolio_status: "draft" | "published";
  portfolio_slug: string;
}

// Publish flow (T3.4): draft <-> published toggle with slug
// generation/confirmation. This is what gates the public route (T3.2) —
// see apps/api/src/portfolio/getPublishedPortfolio.ts.
export function createPublishRouter(config: PublishRouterConfig): Router {
  const router = Router();

  async function findUser(pathwisseUserId: string): Promise<UserRow | null> {
    const result = await config.pool.query<UserRow>(
      "select id, portfolio_status, portfolio_slug from users where pathwisse_user_id = $1",
      [pathwisseUserId],
    );
    return result.rows[0] ?? null;
  }

  router.get("/", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const user = await findUser(pathwisseUserId);
    if (!user) {
      res.status(404).json({ error: "portfolio not found yet" });
      return;
    }

    res.json({ status: user.portfolio_status, slug: user.portfolio_slug });
  });

  router.put("/", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const parsed = parsePublishRequest(req.body);
    if (typeof parsed === "string") {
      res.status(400).json({ error: parsed });
      return;
    }

    const user = await findUser(pathwisseUserId);
    if (!user) {
      res.status(404).json({ error: "portfolio not found yet" });
      return;
    }

    try {
      const result = await publishPortfolio(config.pool, user.id, parsed.slug);
      res.json(result);
    } catch (error) {
      if (error instanceof SlugTakenError) {
        res.status(409).json({ error: "that slug is already taken" });
        return;
      }
      throw error;
    }
  });

  router.put("/unpublish", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const user = await findUser(pathwisseUserId);
    if (!user) {
      res.status(404).json({ error: "portfolio not found yet" });
      return;
    }

    const result = await unpublishPortfolio(config.pool, user.id);
    res.json(result);
  });

  return router;
}
