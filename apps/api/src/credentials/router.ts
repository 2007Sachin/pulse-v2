import { Router } from "express";
import type { Pool } from "pg";
import { requireAuth } from "../auth/middleware.js";

export interface CredentialsRouterConfig {
  pool: Pool;
  sessionSecret: string;
}

interface VerifiedCredentialRow {
  id: string;
  credential_type: string;
  title: string;
  score: string | null;
  summary: string | null;
  issued_at: Date;
}

// Serves the Verified Proof tier (T2.2) for the signed-in candidate.
// Read-only: verified_credentials is append-only and never edited here.
export function createCredentialsRouter(config: CredentialsRouterConfig): Router {
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
      res.json({ credentials: [] });
      return;
    }

    const credentialsResult = await config.pool.query<VerifiedCredentialRow>(
      `select id, credential_type, title, score, summary, issued_at
       from verified_credentials
       where user_id = $1
       order by issued_at desc`,
      [userRow.id],
    );

    res.json({
      credentials: credentialsResult.rows.map((row) => ({
        id: row.id,
        credentialType: row.credential_type,
        title: row.title,
        score: row.score === null ? null : Number(row.score),
        summary: row.summary,
        issuedAt: row.issued_at,
      })),
    });
  });

  return router;
}
