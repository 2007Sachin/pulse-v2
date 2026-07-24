import type { GitHubRepoApiResponse, NormalizedRepo } from "./types.js";

const GITHUB_API_BASE_URL = "https://api.github.com";
const PER_PAGE = 100;
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;

export class GitHubUserNotFoundError extends Error {
  constructor(username: string) {
    super(`GitHub user not found: ${username}`);
    this.name = "GitHubUserNotFoundError";
  }
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(
    message: string,
    status: number,
    public readonly retryAfterMs: number | null,
  ) {
    super(message, status);
    this.name = "GitHubRateLimitError";
  }
}

export interface FetchPublicReposOptions {
  githubToken: string;
  fetcher?: typeof fetch;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

function normalizeRepo(repo: GitHubRepoApiResponse): NormalizedRepo {
  return {
    repoName: repo.name,
    repoUrl: repo.html_url,
    description: repo.description,
    primaryLanguage: repo.language,
    stars: repo.stargazers_count,
    lastUpdatedAt: repo.updated_at,
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True for responses worth retrying: rate limiting, and transient server errors. */
function isRetryableStatus(status: number): boolean {
  return status === 403 || status === 429 || status >= 500;
}

/** Rate-limit headers use seconds (Retry-After) or epoch seconds (X-RateLimit-Reset). */
function retryDelayFromHeaders(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_BACKOFF_MS);
    }
  }

  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  if (remaining === "0" && reset !== null) {
    const resetEpochSeconds = Number(reset);
    if (Number.isFinite(resetEpochSeconds)) {
      const delayMs = resetEpochSeconds * 1000 - Date.now();
      if (delayMs > 0) {
        return Math.min(delayMs, MAX_BACKOFF_MS);
      }
    }
  }

  return Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
}

function isRateLimitResponse(response: Response): boolean {
  if (response.status === 429) {
    return true;
  }
  return response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";
}

/**
 * Fetches a single page, retrying with backoff on rate limiting (403/429) and
 * transient server errors (5xx). Non-retryable errors (404, other 4xx) throw
 * immediately.
 */
async function fetchPageWithRetry(
  doFetch: typeof fetch,
  url: URL,
  username: string,
  githubToken: string,
  maxRetries: number,
  sleep: (ms: number) => Promise<void>,
): Promise<GitHubRepoApiResponse[]> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response;
    try {
      response = await doFetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) {
        throw lastError;
      }
      await sleep(Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS));
      continue;
    }

    if (response.status === 404) {
      throw new GitHubUserNotFoundError(username);
    }

    if (response.ok) {
      return (await response.json()) as GitHubRepoApiResponse[];
    }

    if (!isRetryableStatus(response.status) || attempt === maxRetries) {
      const message = isRateLimitResponse(response)
        ? `GitHub API rate limit exceeded (status ${response.status})`
        : `GitHub API request failed with status ${response.status}`;
      throw isRateLimitResponse(response)
        ? new GitHubRateLimitError(message, response.status, retryDelayFromHeaders(response, attempt))
        : new GitHubApiError(message, response.status);
    }

    await sleep(retryDelayFromHeaders(response, attempt));
  }

  // Unreachable: the loop always returns or throws.
  throw lastError ?? new Error("GitHub API request failed");
}

/**
 * Fetches a GitHub user's public repos using Pulse's own server-side token
 * (not per-user OAuth), and normalizes them for `cached_repos`.
 *
 * Respects GitHub's rate-limit signals (`Retry-After`, `X-RateLimit-Reset`)
 * and retries transient failures (429/403 rate limiting, 5xx) with
 * exponential backoff, up to `maxRetries` attempts per page.
 */
export async function fetchPublicRepos(
  username: string,
  options: FetchPublicReposOptions,
): Promise<NormalizedRepo[]> {
  const doFetch = options.fetcher ?? fetch;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const sleep = options.sleep ?? defaultSleep;
  const repos: NormalizedRepo[] = [];

  let page = 1;
  for (;;) {
    const url = new URL(`${GITHUB_API_BASE_URL}/users/${encodeURIComponent(username)}/repos`);
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("type", "owner");
    url.searchParams.set("sort", "updated");

    const body = await fetchPageWithRetry(doFetch, url, username, options.githubToken, maxRetries, sleep);
    repos.push(...body.filter((repo) => !repo.private).map(normalizeRepo));

    if (body.length < PER_PAGE) {
      break;
    }
    page += 1;
  }

  return repos;
}
