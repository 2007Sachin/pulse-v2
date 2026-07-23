import { Router } from "express";
import type { Pool } from "pg";
import { requireAuth } from "../auth/middleware.js";
import { parseNarrativeInput } from "./types.js";

export interface NarrativeRouterConfig {
  pool: Pool;
  sessionSecret: string;
}

interface NarrativeRow {
  bio: string | null;
  career_intent: string | null;
}

// Serves the Narrative tier (T2.5): a short, self-authored bio + career
// intent. Both read and write require an existing `users` row, which is
// auto-created on the candidate's first Pathwisse event (T2.1) — this
// endpoint doesn't create one itself.
export function createNarrativeRouter(config: NarrativeRouterConfig): Router {
  const router = Router();

  router.get("/", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const userResult = await config.pool.query<{ id: string }>(
      "select id from users where pathwisse_user_id = $1",
      [pathwisseUserId],
    );

    const userRow = userResult.rows[0];
    if (!userRow) {
      res.json({ bio: null, careerIntent: null });
      return;
    }

    const narrativeResult = await config.pool.query<NarrativeRow>(
      "select bio, career_intent from narrative where user_id = $1",
      [userRow.id],
    );

    const narrativeRow = narrativeResult.rows[0];
    res.json({
      bio: narrativeRow?.bio ?? null,
      careerIntent: narrativeRow?.career_intent ?? null,
    });
  });

  router.put("/", requireAuth(config.sessionSecret), async (req, res) => {
    const pathwisseUserId = req.auth?.pathwisseUserId;
    if (!pathwisseUserId) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const parsed = parseNarrativeInput(req.body);
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

    const upsertResult = await config.pool.query<NarrativeRow>(
      `insert into narrative (user_id, bio, career_intent, updated_at)
       values ($1, $2, $3, now())
       on conflict (user_id) do update set
         bio = excluded.bio,
         career_intent = excluded.career_intent,
         updated_at = now()
       returning bio, career_intent`,
      [userRow.id, parsed.bio, parsed.careerIntent],
    );

    const savedRow = upsertResult.rows[0];
    res.json({
      bio: savedRow?.bio ?? null,
      careerIntent: savedRow?.career_intent ?? null,
    });
  });

  return router;
}
