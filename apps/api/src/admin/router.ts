import { Router } from "express";
import type { Pool } from "pg";
import { timingSafeStringEqual } from "../auth/timingSafeCompare.js";
import { getSyncEventsLog, isSyncEventsLogFilter } from "./getSyncEventsLog.js";

export interface AdminRouterConfig {
  pool: Pool;
  sharedSecret: string;
}

// Admin/debug view (T4.4): surfaces sync_events_log rows for manual
// investigation of unprocessed/errored Pathwisse events. Not user-facing —
// gated by a separate out-of-band shared secret, same shape as the events
// ingestion auth in ../events/router.ts.
export function createAdminRouter(config: AdminRouterConfig): Router {
  const router = Router();

  router.get("/sync-events", async (req, res) => {
    const authHeader = req.header("authorization") ?? "";
    if (!timingSafeStringEqual(authHeader, `Bearer ${config.sharedSecret}`)) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const rawFilter = typeof req.query.filter === "string" ? req.query.filter : "attention";
    if (!isSyncEventsLogFilter(rawFilter)) {
      res.status(400).json({ error: "filter must be one of: attention, unprocessed, errored, all" });
      return;
    }

    const rawLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const limit = rawLimit !== undefined && Number.isFinite(rawLimit) ? rawLimit : undefined;

    try {
      const events = await getSyncEventsLog(config.pool, rawFilter, limit);
      res.json({ filter: rawFilter, events });
    } catch (error) {
      console.error("failed to load sync_events_log for admin view", error);
      res.status(500).json({ error: "internal error loading sync events" });
    }
  });

  return router;
}
