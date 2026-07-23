import { describe, expect, it, vi } from "vitest";
import {
  getPortfolioAnalytics,
  recordPortfolioShareClick,
  recordPortfolioView,
} from "./analyticsService.js";

function fakePool(rows: unknown[]) {
  const query = vi.fn().mockResolvedValue({ rows });
  return { query };
}

describe("recordPortfolioView", () => {
  it("upserts a view, incrementing on conflict", async () => {
    const pool = fakePool([]);

    await recordPortfolioView(pool as never, "user-1");

    const [sql, params] = pool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/insert into portfolio_analytics/i);
    expect(sql).toMatch(/on conflict \(user_id\) do update set/i);
    expect(sql).toMatch(/view_count = portfolio_analytics\.view_count \+ 1/);
    expect(params).toEqual(["user-1"]);
  });
});

describe("recordPortfolioShareClick", () => {
  it("upserts a share click, incrementing on conflict", async () => {
    const pool = fakePool([]);

    await recordPortfolioShareClick(pool as never, "user-1");

    const [sql, params] = pool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/insert into portfolio_analytics/i);
    expect(sql).toMatch(/share_click_count = portfolio_analytics\.share_click_count \+ 1/);
    expect(params).toEqual(["user-1"]);
  });
});

describe("getPortfolioAnalytics", () => {
  it("returns the stored counts", async () => {
    const pool = fakePool([{ view_count: 42, share_click_count: 7 }]);

    const result = await getPortfolioAnalytics(pool as never, "user-1");

    expect(result).toEqual({ viewCount: 42, shareClickCount: 7 });
  });

  it("defaults to zero counts when the user has never been tracked", async () => {
    const pool = fakePool([]);

    const result = await getPortfolioAnalytics(pool as never, "user-1");

    expect(result).toEqual({ viewCount: 0, shareClickCount: 0 });
  });
});
