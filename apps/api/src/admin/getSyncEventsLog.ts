import type { Pool } from "pg";

export type SyncEventsLogFilter = "attention" | "unprocessed" | "errored" | "all";

export interface SyncEventLogRow {
  id: string;
  eventType: string;
  payload: unknown;
  processedAt: Date | null;
  error: string | null;
  receivedAt: Date;
}

interface RawRow {
  id: string;
  event_type: string;
  payload: unknown;
  processed_at: Date | null;
  error: string | null;
  received_at: Date;
}

const FILTER_CLAUSE: Record<SyncEventsLogFilter, string> = {
  // Anything a human should look at: still unprocessed, or failed with an error.
  attention: "where processed_at is null or error is not null",
  unprocessed: "where processed_at is null",
  errored: "where error is not null",
  all: "",
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

/**
 * Fetches rows from `sync_events_log` for the T4.4 admin/debug view, most
 * recent first. Defaults to only events that need attention (unprocessed or
 * errored) since that's what manual investigation cares about.
 */
export async function getSyncEventsLog(
  pool: Pool,
  filter: SyncEventsLogFilter = "attention",
  limit: number = DEFAULT_LIMIT,
): Promise<SyncEventLogRow[]> {
  const cappedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

  const result = await pool.query<RawRow>(
    `select id, event_type, payload, processed_at, error, received_at
     from sync_events_log
     ${FILTER_CLAUSE[filter]}
     order by received_at desc
     limit $1`,
    [cappedLimit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    payload: row.payload,
    processedAt: row.processed_at,
    error: row.error,
    receivedAt: row.received_at,
  }));
}

export function isSyncEventsLogFilter(value: string): value is SyncEventsLogFilter {
  return value === "attention" || value === "unprocessed" || value === "errored" || value === "all";
}
