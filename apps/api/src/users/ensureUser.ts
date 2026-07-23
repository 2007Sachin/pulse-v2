import type { Pool, PoolClient } from "pg";

/**
 * Placeholder portfolio slug for an auto-created user. Real slugs are
 * generated/confirmed at publish time (T3.4); this only needs to satisfy the
 * unique, not-null constraint on `users.portfolio_slug` until then.
 */
export function placeholderSlug(pathwisseUserId: string): string {
  const slugified = pathwisseUserId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `pw-${slugified}`;
}

/**
 * Ensures a `users` row exists for the given Pathwisse user, auto-creating
 * one in draft state if this is the first event received for them
 * (ARCHITECTURE.md §6, step 1). Role template and name are not known yet at
 * this point in the flow, so they're seeded with placeholders the candidate
 * fills in later via the portfolio builder.
 *
 * Returns the user's id either way.
 */
export async function ensureUserForPathwisseId(
  client: Pool | PoolClient,
  pathwisseUserId: string,
): Promise<string> {
  const insertResult = await client.query<{ id: string }>(
    `insert into users (pathwisse_user_id, name, role_template, portfolio_status, portfolio_slug)
     values ($1, $2, 'early_career', 'draft', $3)
     on conflict (pathwisse_user_id) do nothing
     returning id`,
    [pathwisseUserId, pathwisseUserId, placeholderSlug(pathwisseUserId)],
  );

  const insertedRow = insertResult.rows[0];
  if (insertedRow) {
    return insertedRow.id;
  }

  const existingResult = await client.query<{ id: string }>(
    "select id from users where pathwisse_user_id = $1",
    [pathwisseUserId],
  );

  const existingRow = existingResult.rows[0];
  if (!existingRow) {
    throw new Error(`failed to find or create user for pathwisse_user_id: ${pathwisseUserId}`);
  }

  return existingRow.id;
}
