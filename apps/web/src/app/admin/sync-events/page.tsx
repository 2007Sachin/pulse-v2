import { notFound } from "next/navigation";
import { fetchSyncEventsLog, type SyncEventsLogFilter } from "@/lib/adminSyncEvents";
import styles from "./page.module.css";

export const metadata = {
  title: "sync_events_log — Pulse v2 admin",
};

interface PageProps {
  searchParams: Promise<{ filter?: string; token?: string }>;
}

const FILTERS: SyncEventsLogFilter[] = ["attention", "unprocessed", "errored", "all"];

function isFilter(value: string | undefined): value is SyncEventsLogFilter {
  return FILTERS.includes(value as SyncEventsLogFilter);
}

function rowClassName(processedAt: string | null, error: string | null): string | undefined {
  if (error) return styles.errorRow;
  if (!processedAt) return styles.unprocessedRow;
  return undefined;
}

/**
 * Admin/debug view (T4.4) for sync_events_log: lets an operator with the
 * shared admin secret see unprocessed/errored Pathwisse events for manual
 * investigation. Deliberately outside any candidate-facing auth — gated by
 * a `?token=` query param checked against the same server-only
 * ADMIN_DEBUG_SHARED_SECRET used to authenticate against the api service,
 * so there's nothing here for someone without that secret to load.
 */
export default async function SyncEventsAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const expectedToken = process.env.ADMIN_DEBUG_SHARED_SECRET;

  if (!expectedToken || params.token !== expectedToken) {
    notFound();
  }

  const filter = isFilter(params.filter) ? params.filter : "attention";
  const events = await fetchSyncEventsLog(filter);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>sync_events_log</h1>
      <p className={styles.subtitle}>Pathwisse → Pulse v2 event pipeline, admin/debug view. Not shown to candidates.</p>

      <nav className={styles.tabs}>
        {FILTERS.map((option) => (
          <a
            key={option}
            href={`?filter=${option}&token=${params.token}`}
            className={`${styles.tab} ${option === filter ? styles.tabActive : ""}`}
          >
            {option}
          </a>
        ))}
      </nav>

      {events === null && <p className={styles.empty}>Failed to load sync_events_log from the api service.</p>}

      {events !== null && events.length === 0 && <p className={styles.empty}>No events match this filter.</p>}

      {events !== null && events.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>received_at</th>
              <th>event_type</th>
              <th>processed_at</th>
              <th>error</th>
              <th>payload</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className={rowClassName(event.processedAt, event.error)}>
                <td>{event.receivedAt}</td>
                <td>{event.eventType}</td>
                <td>{event.processedAt ?? "—"}</td>
                <td className={event.error ? styles.errorText : undefined}>{event.error ?? "—"}</td>
                <td>
                  <pre className={styles.payload}>{JSON.stringify(event.payload, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
