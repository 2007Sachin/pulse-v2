import type { Pool, PoolClient } from "pg";
import { fetchPublicRepos } from "../github/githubRepoService.js";
import type { NormalizedRepo } from "../github/types.js";

export interface SyncGithubReposOptions {
  pool: Pool;
  githubToken: string;
  fetchRepos?: (username: string, options: { githubToken: string }) => Promise<NormalizedRepo[]>;
}

export interface SyncGithubReposFailure {
  userId: string;
  githubUsername: string;
  error: string;
}

export interface SyncGithubReposResult {
  usersSynced: number;
  usersFailed: number;
  failures: SyncGithubReposFailure[];
}

interface UserWithGithubUsername {
  id: string;
  github_username: string;
}

async function insertDeadLetter(pool: Pool, userId: string, githubUsername: string, error: string): Promise<void> {
  await pool.query(
    `insert into github_sync_dead_letters (user_id, github_username, error)
     values ($1, $2, $3)`,
    [userId, githubUsername, error],
  );
}

async function upsertRepos(client: PoolClient, userId: string, repos: NormalizedRepo[]): Promise<void> {
  await client.query("begin");
  try {
    for (const repo of repos) {
      await client.query(
        `insert into cached_repos
           (user_id, repo_name, repo_url, description, primary_language, stars, last_updated_at, fetched_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())
         on conflict (user_id, repo_name) do update set
           repo_url = excluded.repo_url,
           description = excluded.description,
           primary_language = excluded.primary_language,
           stars = excluded.stars,
           last_updated_at = excluded.last_updated_at,
           fetched_at = now()`,
        [
          userId,
          repo.repoName,
          repo.repoUrl,
          repo.description,
          repo.primaryLanguage,
          repo.stars,
          repo.lastUpdatedAt,
        ],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

/**
 * Scheduled job (T1.4): iterates every user with a `github_username` set,
 * fetches their public repos (T1.3), and upserts the results into
 * `cached_repos`. One user's GitHub API failure is caught, recorded in the
 * result, and dead-lettered into `github_sync_dead_letters` for manual
 * review — it never blocks the rest of the batch and is never silently
 * dropped.
 */
export async function syncGithubRepos(options: SyncGithubReposOptions): Promise<SyncGithubReposResult> {
  const { pool, githubToken } = options;
  const fetchRepos = options.fetchRepos ?? fetchPublicRepos;

  const usersResult = await pool.query<UserWithGithubUsername>(
    "select id, github_username from users where github_username is not null",
  );

  const result: SyncGithubReposResult = { usersSynced: 0, usersFailed: 0, failures: [] };

  for (const user of usersResult.rows) {
    try {
      const repos = await fetchRepos(user.github_username, { githubToken });

      const client = await pool.connect();
      try {
        await upsertRepos(client, user.id, repos);
      } finally {
        client.release();
      }

      result.usersSynced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      result.usersFailed += 1;
      result.failures.push({ userId: user.id, githubUsername: user.github_username, error: message });
      console.error(
        `github-sync-worker: failed to sync ${user.github_username} (user ${user.id}): ${message}`,
      );

      try {
        await insertDeadLetter(pool, user.id, user.github_username, message);
      } catch (deadLetterError) {
        console.error(
          `github-sync-worker: failed to dead-letter ${user.github_username} (user ${user.id}): ${
            deadLetterError instanceof Error ? deadLetterError.message : "unknown error"
          }`,
        );
      }
    }
  }

  return result;
}
