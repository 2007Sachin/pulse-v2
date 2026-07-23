import { Router } from "express";
import type { Pool } from "pg";
import { requireAuth } from "../auth/middleware.js";
import { acknowledgeReshare, getReshareStatus } from "./reshareService.js";

export interface ReshareRouterConfig {
  pool: Pool;
  sessionSecret: string;
}

// Re-share prompt (T4.1): surfaces "your portfolio was updated" for an
// already-published candidate once a new verified credential has landed
// since they last shared.
export function createReshareRouter(config: ReshareRouterConfig): Router {
  const router = Router();

  async function findUserId(pathwisseUserId: string): Promise<string | null> {
    const result = await config.pool.query<{ id: string }>(
      "select id from users where pathwisse_user_id = $1",
      [pathwisseUserId],
    );
    return result.rows[0]?.id ?? null;
  }

  router.get("/", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    try {
      const userId = await findUserId(pathwisseUserId);
      if (!userId) {
        res.json({ shouldPrompt: false, newCredentialCount: 0 });
        return;
      }

      const status = await getReshareStatus(config.pool, userId);
      res.json(status);
    } catch (error) {
      console.error("failed to load reshare status", error);
      res.status(500).json({ error: "internal error loading reshare status" });
    }
  });

  router.put("/dismiss", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    try {
      const userId = await findUserId(pathwisseUserId);
      if (!userId) {
        res.status(404).json({ error: "portfolio not found yet" });
        return;
      }

      await acknowledgeReshare(config.pool, userId);
      res.json({ shouldPrompt: false, newCredentialCount: 0 });
    } catch (error) {
      console.error("failed to dismiss reshare prompt", error);
      res.status(500).json({ error: "internal error dismissing reshare prompt" });
    }
  });

  return router;
}
