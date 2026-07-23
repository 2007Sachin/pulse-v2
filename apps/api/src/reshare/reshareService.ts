import type { Pool, PoolClient } from "pg";

export interface ReshareStatus {
  shouldPrompt: boolean;
  newCredentialCount: number;
}

const NO_PROMPT: ReshareStatus = { shouldPrompt: false, newCredentialCount: 0 };

/**
 * Re-share prompt (T4.1): whether a published portfolio has verified
 * credentials newer than the last time the candidate shared it
 * (ARCHITECTURE.md §6 step 6 — "new verified events ... trigger an optional
 * re-share prompt"). Derived entirely from existing data — verified_credentials
 * rows created after users.last_shared_at — so T1.2's event ingestion doesn't
 * need to know anything about re-share; a new credential just naturally
 * starts showing up here once it lands.
 *
 * A draft portfolio, or one that's never been shared (last_shared_at is
 * null — shouldn't happen once published, but a safe default), never
 * prompts.
 */
export async function getReshareStatus(client: Pool | PoolClient, userId: string): Promise<ReshareStatus> {
  const userResult = await client.query<{
    portfolio_status: string;
    last_shared_at: Date | null;
  }>("select portfolio_status, last_shared_at from users where id = $1", [userId]);

  const userRow = userResult.rows[0];
  if (!userRow || userRow.portfolio_status !== "published" || !userRow.last_shared_at) {
    return NO_PROMPT;
  }

  const countResult = await client.query<{ count: string }>(
    "select count(*) from verified_credentials where user_id = $1 and created_at > $2",
    [userId, userRow.last_shared_at],
  );

  const newCredentialCount = Number(countResult.rows[0]?.count ?? 0);
  return { shouldPrompt: newCredentialCount > 0, newCredentialCount };
}

/**
 * Acknowledges the re-share prompt without necessarily re-publishing —
 * bumps last_shared_at so today's new credentials stop being "new" for the
 * next check. Re-publishing (publishPortfolio) does the same bump.
 */
export async function acknowledgeReshare(client: Pool | PoolClient, userId: string): Promise<void> {
  await client.query("update users set last_shared_at = now() where id = $1", [userId]);
}
