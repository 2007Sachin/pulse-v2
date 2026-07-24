import { Pool } from "pg";

// apps/api is a single long-running process (see ARCHITECTURE.md §8 /
// README "Deployment"), so one process-wide pool is the right pattern here —
// this is NOT deployed as a Vercel serverless function, which would instead
// need a transaction-mode pooler (e.g. Supabase/Neon/PgBouncer) in front of
// Postgres to avoid exhausting connections under per-invocation scaling.
// DATABASE_URL should still point at your provider's pooled connection
// string where available, since Postgres itself has a hard connection cap.
const DEFAULT_POOL_MAX = 10;

export function createDbPool(databaseUrl: string): Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.DB_POOL_MAX) || DEFAULT_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Without this handler, an error on an idle client (e.g. the DB dropping
  // a connection) is an uncaught 'error' event and crashes the process.
  pool.on("error", (error) => {
    console.error("unexpected error on idle Postgres client", error);
  });

  return pool;
}
