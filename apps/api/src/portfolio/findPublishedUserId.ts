import type { Pool } from "pg";

/**
 * Resolves a portfolio_slug to a user id, but only if that portfolio is
 * actually published. Returns null both when the slug doesn't exist AND
 * when it belongs to a draft — the one gate shared by every public,
 * unauthenticated route keyed on slug (the portfolio page itself, view
 * tracking, share-click tracking), so a draft in progress is never
 * reachable or countable before the publish flow (T3.4) flips
 * portfolio_status.
 */
export async function findPublishedUserId(pool: Pool, slug: string): Promise<string | null> {
  const result = await pool.query<{ id: string; portfolio_status: string }>(
    "select id, portfolio_status from users where portfolio_slug = $1",
    [slug],
  );

  const row = result.rows[0];
  if (!row || row.portfolio_status !== "published") {
    return null;
  }

  return row.id;
}
