import type { GitHubRepoApiResponse, NormalizedRepo } from "./types.js";

const GITHUB_API_BASE_URL = "https://api.github.com";
const PER_PAGE = 100;

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

export interface FetchPublicReposOptions {
  githubToken: string;
  fetcher?: typeof fetch;
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

/**
 * Fetches a GitHub user's public repos using Pulse's own server-side token
 * (not per-user OAuth), and normalizes them for `cached_repos`.
 */
export async function fetchPublicRepos(
  username: string,
  options: FetchPublicReposOptions,
): Promise<NormalizedRepo[]> {
  const doFetch = options.fetcher ?? fetch;
  const repos: NormalizedRepo[] = [];

  let page = 1;
  for (;;) {
    const url = new URL(`${GITHUB_API_BASE_URL}/users/${encodeURIComponent(username)}/repos`);
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("type", "owner");
    url.searchParams.set("sort", "updated");

    const response = await doFetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${options.githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.status === 404) {
      throw new GitHubUserNotFoundError(username);
    }

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub API request failed with status ${response.status}`,
        response.status,
      );
    }

    const body = (await response.json()) as GitHubRepoApiResponse[];
    repos.push(...body.filter((repo) => !repo.private).map(normalizeRepo));

    if (body.length < PER_PAGE) {
      break;
    }
    page += 1;
  }

  return repos;
}
