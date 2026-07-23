export type SyncEventsLogFilter = "attention" | "unprocessed" | "errored" | "all";

export interface SyncEventLogEntry {
  id: string;
  eventType: string;
  payload: unknown;
  processedAt: string | null;
  error: string | null;
  receivedAt: string;
}

interface SyncEventsLogResponse {
  filter: SyncEventsLogFilter;
  events: SyncEventLogEntry[];
}

/**
 * Fetches sync_events_log rows from the api service's admin/debug route
 * (T4.4), authenticating with the server-only ADMIN_DEBUG_SHARED_SECRET.
 * Never call this from client code — the secret must stay server-side.
 */
export async function fetchSyncEventsLog(
  filter: SyncEventsLogFilter,
): Promise<SyncEventLogEntry[] | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const secret = process.env.ADMIN_DEBUG_SHARED_SECRET;

  if (!secret) {
    return null;
  }

  const response = await fetch(`${apiUrl}/admin/sync-events?filter=${filter}`, {
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as SyncEventsLogResponse;
  return body.events;
}
