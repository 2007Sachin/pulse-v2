import type { Pool, PoolClient } from "pg";
import { triggerShareCardGeneration } from "./shareCard.js";

export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`slug already taken: ${slug}`);
    this.name = "SlugTakenError";
  }
}

export interface PublishStatus {
  status: "draft" | "published";
  slug: string;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * Confirms/changes the candidate's public slug and flips portfolio_status
 * to 'published' (ARCHITECTURE.md's publish step, T3.4). Fires the T3.3
 * share-card hook once the flip succeeds.
 */
export async function publishPortfolio(
  client: Pool | PoolClient,
  userId: string,
  slug: string,
): Promise<PublishStatus> {
  let result;
  try {
    result = await client.query<{ portfolio_slug: string }>(
      `update users
       set portfolio_slug = $1, portfolio_status = 'published', last_shared_at = now(), updated_at = now()
       where id = $2
       returning portfolio_slug`,
      [slug, userId],
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SlugTakenError(slug);
    }
    throw error;
  }

  const row = result.rows[0];
  if (!row) {
    throw new Error(`failed to publish portfolio for user: ${userId}`);
  }

  await triggerShareCardGeneration(userId);

  return { status: "published", slug: row.portfolio_slug };
}

/** Reverts a published portfolio to draft. The slug is kept, not freed. */
export async function unpublishPortfolio(
  client: Pool | PoolClient,
  userId: string,
): Promise<PublishStatus> {
  const result = await client.query<{ portfolio_slug: string }>(
    `update users
     set portfolio_status = 'draft', updated_at = now()
     where id = $1
     returning portfolio_slug`,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`failed to unpublish portfolio for user: ${userId}`);
  }

  return { status: "draft", slug: row.portfolio_slug };
}
