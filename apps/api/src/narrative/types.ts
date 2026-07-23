// Tier 3 — Narrative (ARCHITECTURE.md §4): fully self-authored, deliberately
// short. Limits are enforced here (the application layer, per SCHEMA.md's
// note on `narrative.bio`) rather than via a rich text editor or a DB
// constraint.
export const BIO_MAX_LENGTH = 280;
export const CAREER_INTENT_MAX_LENGTH = 140;

export interface ParsedNarrativeInput {
  bio: string | null;
  careerIntent: string | null;
}

/**
 * Validates and normalizes a narrative form submission. Empty strings are
 * treated as "not set" (normalized to null) rather than rejected, since both
 * fields are optional.
 */
export function parseNarrativeInput(body: unknown): ParsedNarrativeInput | string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;

  if (b.bio !== undefined && b.bio !== null && typeof b.bio !== "string") {
    return "bio must be a string if present";
  }

  if (b.careerIntent !== undefined && b.careerIntent !== null && typeof b.careerIntent !== "string") {
    return "careerIntent must be a string if present";
  }

  const bio = typeof b.bio === "string" ? b.bio.trim() : null;
  const careerIntent = typeof b.careerIntent === "string" ? b.careerIntent.trim() : null;

  if (bio !== null && bio.length > BIO_MAX_LENGTH) {
    return `bio must be ${BIO_MAX_LENGTH} characters or fewer`;
  }

  if (careerIntent !== null && careerIntent.length > CAREER_INTENT_MAX_LENGTH) {
    return `careerIntent must be ${CAREER_INTENT_MAX_LENGTH} characters or fewer`;
  }

  return {
    bio: bio === "" ? null : bio,
    careerIntent: careerIntent === "" ? null : careerIntent,
  };
}
