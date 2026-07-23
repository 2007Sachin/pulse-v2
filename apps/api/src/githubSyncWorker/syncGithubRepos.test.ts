import { describe, expect, it, vi } from "vitest";
import type { NormalizedRepo } from "../github/types.js";
import { syncGithubRepos } from "./syncGithubRepos.js";

function makeRepo(overrides: Partial<NormalizedRepo> = {}): NormalizedRepo {
  return {
    repoName: "pulse-v2",
    repoUrl: "https://github.com/octocat/pulse-v2",
    description: "A portfolio app",
    primaryLanguage: "TypeScript",
    stars: 42,
    lastUpdatedAt: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeFakePool(users: { id: string; github_username: string }[]) {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };

  const pool = {
    query: vi.fn().mockResolvedValue({ rows: users }),
    connect: vi.fn().mockResolvedValue(client),
  };

  return { pool, client };
}

describe("syncGithubRepos", () => {
  it("upserts fetched repos for every user with a github_username", async () => {
    const { pool, client } = makeFakePool([{ id: "user-1", github_username: "octocat" }]);
    const fetchRepos = vi.fn().mockResolvedValue([makeRepo()]);

    const result = await syncGithubRepos({
      pool: pool as never,
      githubToken: "test-token",
      fetchRepos,
    });

    expect(fetchRepos).toHaveBeenCalledWith("octocat", { githubToken: "test-token" });
    expect(result.usersSynced).toBe(1);
    expect(result.usersFailed).toBe(0);
    expect(result.failures).toEqual([]);

    const upsertCall = client.query.mock.calls.find((call) =>
      String(call[0]).includes("insert into cached_repos"),
    );
    expect(upsertCall).toBeDefined();
    expect(upsertCall?.[1]).toEqual([
      "user-1",
      "pulse-v2",
      "https://github.com/octocat/pulse-v2",
      "A portfolio app",
      "TypeScript",
      42,
      "2026-01-15T10:00:00Z",
    ]);
    expect(client.release).toHaveBeenCalled();
  });

  it("does not query the database for users without a github_username", async () => {
    const { pool } = makeFakePool([]);
    const fetchRepos = vi.fn();

    await syncGithubRepos({ pool: pool as never, githubToken: "test-token", fetchRepos });

    expect(pool.query).toHaveBeenCalledWith(
      "select id, github_username from users where github_username is not null",
    );
    expect(fetchRepos).not.toHaveBeenCalled();
  });

  it("records a per-user failure without aborting the rest of the batch", async () => {
    const { pool, client } = makeFakePool([
      { id: "user-1", github_username: "broken-user" },
      { id: "user-2", github_username: "octocat" },
    ]);

    const fetchRepos = vi
      .fn()
      .mockRejectedValueOnce(new Error("GitHub user not found: broken-user"))
      .mockResolvedValueOnce([makeRepo()]);

    const result = await syncGithubRepos({
      pool: pool as never,
      githubToken: "test-token",
      fetchRepos,
    });

    expect(fetchRepos).toHaveBeenCalledTimes(2);
    expect(result.usersSynced).toBe(1);
    expect(result.usersFailed).toBe(1);
    expect(result.failures).toEqual([
      {
        userId: "user-1",
        githubUsername: "broken-user",
        error: "GitHub user not found: broken-user",
      },
    ]);
    // second user's repo still got upserted despite the first user's failure
    expect(
      client.query.mock.calls.some((call) => String(call[0]).includes("insert into cached_repos")),
    ).toBe(true);
  });

  it("rolls back the transaction if an upsert fails partway through", async () => {
    const users = [{ id: "user-1", github_username: "octocat" }];
    const client = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (typeof sql === "string" && sql.startsWith("insert into cached_repos")) {
          return Promise.reject(new Error("db is down"));
        }
        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: users }),
      connect: vi.fn().mockResolvedValue(client),
    };
    const fetchRepos = vi.fn().mockResolvedValue([makeRepo()]);

    const result = await syncGithubRepos({ pool: pool as never, githubToken: "test-token", fetchRepos });

    expect(result.usersFailed).toBe(1);
    expect(result.failures[0]?.error).toBe("db is down");
    expect(client.query).toHaveBeenCalledWith("rollback");
    expect(client.release).toHaveBeenCalled();
  });
});
