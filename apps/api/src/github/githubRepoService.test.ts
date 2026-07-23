import { describe, expect, it, vi } from "vitest";
import { fetchPublicRepos, GitHubApiError, GitHubUserNotFoundError } from "./githubRepoService.js";
import type { GitHubRepoApiResponse } from "./types.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

  it("throws GitHubUserNotFoundError on a 404 response", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(404, { message: "Not Found" }));

    await expect(
      fetchPublicRepos("does-not-exist", { githubToken: "test-token", fetcher }),
    ).rejects.toBeInstanceOf(GitHubUserNotFoundError);
  });

  it("throws GitHubApiError on other non-OK responses (e.g. rate limiting)", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(403, { message: "API rate limit exceeded" }));

    const error = await fetchPublicRepos("octocat", { githubToken: "test-token", fetcher }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(GitHubApiError);
    expect((error as GitHubApiError).status).toBe(403);
  });
});
