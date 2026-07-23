// Publish flow (T3.4): draft <-> published toggle, with slug
// generation/confirmation. Slugs are user-facing URL segments
// (SCHEMA.md users.portfolio_slug), so they're constrained more tightly
// than a free-text field.
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 60;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ParsedPublishRequest {
  slug: string;
}

/**
 * Validates and normalizes a publish request's slug. Lowercases and trims
 * before checking shape, so "Aditi-Rao " and "aditi-rao" are treated the
 * same. Doesn't check uniqueness — that's enforced by the DB's unique
 * constraint on `portfolio_slug` and handled by the caller.
 */
export function parsePublishRequest(body: unknown): ParsedPublishRequest | string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;

  if (typeof b.slug !== "string" || b.slug.trim().length === 0) {
    return "slug is required";
  }

  const slug = b.slug.trim().toLowerCase();

  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {
    return `slug must be between ${SLUG_MIN_LENGTH} and ${SLUG_MAX_LENGTH} characters`;
  }

  if (!SLUG_PATTERN.test(slug)) {
    return "slug may only contain lowercase letters, numbers, and single hyphens between them";
  }

  return { slug };
}
