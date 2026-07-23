import { Router } from "express";
import type { Pool } from "pg";
import { CREDENTIAL_TYPE_BY_EVENT_TYPE, parsePathwisseEvent } from "./types.js";

export interface EventsRouterConfig {
  pool: Pool;
  sharedSecret: string;
}

// Ingests Pathwisse events (certificate issued, skill card earned, sprint
// completed, interview verdict scored). Every request is logged to
// sync_events_log first, then processed into verified_credentials.
// Idempotent on source_event_id: verified_credentials.source_event_id is
// unique, so re-delivering the same event is a no-op on that table.
export function createEventsRouter(config: EventsRouterConfig): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const authHeader = req.header("authorization") ?? "";
    if (authHeader !== `Bearer ${config.sharedSecret}`) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    const rawEventType = typeof req.body?.event_type === "string" ? req.body.event_type : "unknown";
    const parsed = parsePathwisseEvent(req.body);

    if (typeof parsed === "string") {
      // Still record malformed-but-parseable deliveries for later triage (T4.4),
      // unless the body wasn't even a JSON object worth logging.
      if (typeof req.body === "object" && req.body !== null) {
        await config.pool.query(
          `insert into sync_events_log (event_type, payload, error, received_at, processed_at)
           values ($1, $2, $3, now(), now())`,
          [rawEventType, JSON.stringify(req.body), parsed],
        );
      }
      res.status(400).json({ error: parsed });
      return;
    }

    const client = await config.pool.connect();
    try {
      const logResult = await client.query<{ id: string }>(
        `insert into sync_events_log (event_type, payload, received_at)
         values ($1, $2, now())
         returning id`,
        [parsed.eventType, JSON.stringify(req.body)],
      );
      const logRow = logResult.rows[0];
      if (!logRow) {
        throw new Error("sync_events_log insert did not return a row");
      }
      const logId = logRow.id;

      const userResult = await client.query<{ id: string }>(
        "select id from users where pathwisse_user_id = $1",
        [parsed.pathwisseUserId],
      );

      const userRow = userResult.rows[0];
      if (!userRow) {
        await client.query(
          "update sync_events_log set error = $1, processed_at = now() where id = $2",
          [`unknown pathwisse_user_id: ${parsed.pathwisseUserId}`, logId],
        );
        res.status(202).json({ status: "logged", processed: false });
        return;
      }

      const userId = userRow.id;
      const credentialType = CREDENTIAL_TYPE_BY_EVENT_TYPE[parsed.eventType];

      const credentialResult = await client.query<{ id: string }>(
        `insert into verified_credentials
           (user_id, credential_type, title, score, summary, issued_at, source_event_id)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (source_event_id) do nothing
         returning id`,
        [
          userId,
          credentialType,
          parsed.title,
          parsed.score,
          parsed.summary,
          parsed.occurredAt,
          parsed.eventId,
        ],
      );

      await client.query("update sync_events_log set processed_at = now() where id = $1", [logId]);

      const createdRow = credentialResult.rows[0];
      res.status(createdRow ? 201 : 200).json({
        status: "ok",
        credentialId: createdRow ? createdRow.id : null,
        duplicate: !createdRow,
      });
    } catch (error) {
      console.error("failed to process Pathwisse event", error);
      res.status(500).json({ error: "internal error processing event" });
    } finally {
      client.release();
    }
  });

  return router;
}
