import "dotenv/config";
import { createDbPool } from "../db/pool.js";
import { syncGithubRepos } from "./syncGithubRepos.js";

// Standalone entrypoint for the github-sync-worker (T1.4). Intended to be
// invoked on a schedule (e.g. daily) by whatever cron/scheduler the
// deployment target provides — see ARCHITECTURE.md §3.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const githubToken = process.env.GITHUB_API_TOKEN;

  if (!databaseUrl || !githubToken) {
    throw new Error("DATABASE_URL and GITHUB_API_TOKEN must both be set");
  }

  const pool = createDbPool(databaseUrl);
  try {
    const result = await syncGithubRepos({ pool, githubToken });
    console.log(
      `github-sync-worker: synced ${result.usersSynced} user(s), ${result.usersFailed} failure(s)`,
    );
    if (result.failures.length > 0) {
      console.log(JSON.stringify(result.failures, null, 2));
      console.log(
        `github-sync-worker: ${result.failures.length} failure(s) written to github_sync_dead_letters for manual review`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
