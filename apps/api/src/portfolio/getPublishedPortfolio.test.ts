import { describe, expect, it, vi } from "vitest";
import { getPublishedPortfolio } from "./getPublishedPortfolio.js";

function fakePool(rowsByQuery: unknown[][]) {
  const query = vi.fn();
  for (const rows of rowsByQuery) {
    query.mockResolvedValueOnce({ rows });
  }
  return { query };
}

const publishedUserRow = {
  id: "user-1",
  name: "Aditi Rao",
  role_template: "dev",
  portfolio_status: "published",
};

const draftUserRow = { ...publishedUserRow, portfolio_status: "draft" };

describe("getPublishedPortfolio", () => {
  it("returns null for a slug that doesn't exist — this is the T3.2 gate", async () => {
    const pool = fakePool([[]]);

    const result = await getPublishedPortfolio(pool as never, "no-such-slug");

    expect(result).toBeNull();
  });

  it("returns null for a slug whose portfolio is still a draft — this is the T3.2 gate", async () => {
    const pool = fakePool([[draftUserRow]]);

    const result = await getPublishedPortfolio(pool as never, "kabir-mehta");

    expect(result).toBeNull();
    // Must not go on to query credentials/projects/narrative for an unpublished portfolio.
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("returns full portfolio data for a published slug", async () => {
    const pool = fakePool([
      [publishedUserRow],
      [
        {
          id: "cred-1",
          credential_type: "certificate",
          title: "Frontend Developer",
          score: "82",
          summary: null,
          issued_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      [
        {
          id: "proj-1",
          source_type: "github_repo",
          cached_repo_id: "repo-1",
          title: "pulse-v2",
          outcome_line: "Shipped the builder flow",
          case_study: null,
          role_specific_fields: { repo_link: "https://github.com/aditirao/pulse-v2" },
          display_order: 0,
        },
      ],
      [{ bio: "I build things.", career_intent: "Frontend roles." }],
    ]);

    const result = await getPublishedPortfolio(pool as never, "aditi-rao");

    expect(result).not.toBeNull();
    expect(result?.candidateName).toBe("Aditi Rao");
    expect(result?.roleTemplate).toBe("dev");
    expect(result?.credentials).toEqual([
      {
        id: "cred-1",
        credentialType: "certificate",
        title: "Frontend Developer",
        score: 82,
        summary: null,
        issuedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    expect(result?.projects).toHaveLength(1);
    expect(result?.narrative).toEqual({ bio: "I build things.", careerIntent: "Frontend roles." });
  });

  it("defaults narrative to nulls when the candidate hasn't written one", async () => {
    const pool = fakePool([[publishedUserRow], [], [], []]);

    const result = await getPublishedPortfolio(pool as never, "aditi-rao");

    expect(result?.narrative).toEqual({ bio: null, careerIntent: null });
  });
});
