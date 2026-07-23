import type { Pool } from "pg";

export interface PortfolioAnalytics {
  viewCount: number;
  shareClickCount: number;
}

/**
 * Increments the view counter for a published portfolio (T4.3). Called once
 * per public page load — see apps/web/src/portfolio/ViewTracker.tsx — not
 * from every internal fetch of the portfolio data (generateMetadata, the OG
 * image route, etc. each re-fetch the same portfolio per request; counting
 * there would wildly overcount a single visit).
 */
export async function recordPortfolioView(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    `insert into portfolio_analytics (user_id, view_count, share_click_count, updated_at)
     values ($1, 1, 0, now())
     on conflict (user_id) do update set
       view_count = portfolio_analytics.view_count + 1,
       updated_at = now()`,
    [userId],
  );
}

/** Increments the share-click counter (T4.3) — a visitor clicked "Share". */
export async function recordPortfolioShareClick(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    `insert into portfolio_analytics (user_id, view_count, share_click_count, updated_at)
     values ($1, 0, 1, now())
     on conflict (user_id) do update set
       share_click_count = portfolio_analytics.share_click_count + 1,
       updated_at = now()`,
    [userId],
  );
}

/** Reads the current counts for a user, defaulting to zero if never tracked. */
export async function getPortfolioAnalytics(pool: Pool, userId: string): Promise<PortfolioAnalytics> {
  const result = await pool.query<{ view_count: number; share_click_count: number }>(
    "select view_count, share_click_count from portfolio_analytics where user_id = $1",
    [userId],
  );

  const row = result.rows[0];
  return {
    viewCount: row?.view_count ?? 0,
    shareClickCount: row?.share_click_count ?? 0,
  };
}
