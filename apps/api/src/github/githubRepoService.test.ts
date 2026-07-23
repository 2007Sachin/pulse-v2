import { describe, expect, it, vi } from "vitest";
import {
  fetchPublicRepos,
  GitHubApiError,
  GitHubRateLimitError,
  GitHubUserNotFoundError,
} from "./githubRepoService.js";
import type { GitHubRepoApiResponse } from "./types.js";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function noopSleep(): Promise<void> {}

function makeRepo(overrides: Partial<GitHubRepoApiResponse> = {}): GitHubRepoApiResponse {
  return {
    name: "pulse-v2",
    html_url: "https://github.com/octocat/pulse-v2",
    description: "A portfolio app",
    language: "TypeScript",
    stargazers_count: 42,
    updated_at: "2026-01-15T10:00:00Z",
    private: false,
    fork: false,
    ...overrides,
  };
}

describe("fetchPublicRepos", () => {
  it("normalizes a page of repos into the cached_repos shape", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, [makeRepo()]));

    const repos = await fetchPublicRepos("octocat", {
      githubToken: "test-token",
      fetcher,
    });

    expect(repos).toEqual([
      {
        repoName: "pulse-v2",
        repoUrl: "https://github.com/octocat/pulse-v2",
        description: "A portfolio app",
        primaryLanguage: "TypeScript",
        stars: 42,
        lastUpdatedAt: "2026-01-15T10:00:00Z",
      },
    ]);
  });

  it("uses Pulse's own server-side token, not per-user OAuth", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, []));

    await fetchPublicRepos("octocat", { githubToken: "server-side-token", fetcher });

    const [, requestInit] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect((requestInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer server-side-token",
    );
  });

  it("handles nullable description and language", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, [makeRepo({ description: null, language: null })]));

    const repos = await fetchPublicRepos("octocat", { githubToken: "test-token", fetcher });

    expect(repos[0]?.description).toBeNull();
    expect(repos[0]?.primaryLanguage).toBeNull();
  });

  it("excludes private repos from the normalized result", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, [makeRepo({ name: "public-repo" }), makeRepo({ name: "secret-repo", private: true })]),
      );

    const repos = await fetchPublicRepos("octocat", { githubToken: "test-token", fetcher });

    expect(repos).toHaveLength(1);
    expect(repos[0]?.repoName).toBe("public-repo");
  });

  it("paginates until a short page is returned", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => makeRepo({ name: `repo-${i}` }));
    const secondPage = [makeRepo({ name: "repo-100" })];

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, fullPage))
      .mockResolvedValueOnce(jsonResponse(200, secondPage));

    const repos = await fetchPublicRepos("octocat", { githubToken: "test-token", fetcher });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(repos).toHaveLength(101);
  });

  it("throws GitHubUserNotFoundError on a 404 response without retrying", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(404, { message: "Not Found" }));

    await expect(
      fetchPublicRepos("does-not-exist", { githubToken: "test-token", fetcher, sleep: noopSleep }),
    ).rejects.toBeInstanceOf(GitHubUserNotFoundError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("throws GitHubApiError on a non-retryable non-OK response", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(422, { message: "Unprocessable" }));

    const error = await fetchPublicRepos("octocat", {
      githubToken: "test-token",
      fetcher,
      sleep: noopSleep,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubApiError);
    expect((error as GitHubApiError).status).toBe(422);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries on rate limiting (403 with exhausted quota) and eventually gives up", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          403,
          { message: "API rate limit exceeded" },
          { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000)) },
        ),
      );

    const error = await fetchPublicRepos("octocat", {
      githubToken: "test-token",
      fetcher,
      maxRetries: 2,
      sleep: noopSleep,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubRateLimitError);
    expect((error as GitHubApiError).status).toBe(403);
    // initial attempt + 2 retries
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("retries on 429 and succeeds once the rate limit clears", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { message: "rate limited" }, { "retry-after": "1" }))
      .mockResolvedValueOnce(jsonResponse(200, []));

    const sleep = vi.fn().mockImplementation(noopSleep);
    const repos = await fetchPublicRepos("octocat", {
      githubToken: "test-token",
      fetcher,
      sleep,
    });

    expect(repos).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("retries on transient 5xx errors and succeeds", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { message: "Service Unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, [makeRepo()]));

    const repos = await fetchPublicRepos("octocat", {
      githubToken: "test-token",
      fetcher,
      sleep: noopSleep,
    });

    expect(repos).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("retries on network errors (fetch rejecting) up to maxRetries", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse(200, [makeRepo()]));

    const repos = await fetchPublicRepos("octocat", {
      githubToken: "test-token",
      fetcher,
      sleep: noopSleep,
    });

    expect(repos).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
