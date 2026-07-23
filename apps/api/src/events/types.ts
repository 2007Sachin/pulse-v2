// Maps Pathwisse event types to the verified_credentials.credential_type
// values defined in SCHEMA.md.
export const CREDENTIAL_TYPE_BY_EVENT_TYPE = {
  certificate_issued: "certificate",
  skill_card_earned: "skill_card",
  sprint_completed: "sprint_completion",
  interview_verdict_scored: "interview_verdict",
} as const;

export type PathwisseEventType = keyof typeof CREDENTIAL_TYPE_BY_EVENT_TYPE;

export interface ParsedPathwisseEvent {
  eventId: string;
  eventType: PathwisseEventType;
  pathwisseUserId: string;
  occurredAt: string;
  title: string;
  score: number | null;
  summary: string | null;
}

function isKnownEventType(value: string): value is PathwisseEventType {
  return Object.prototype.hasOwnProperty.call(CREDENTIAL_TYPE_BY_EVENT_TYPE, value);
}

/**
 * Validates and normalizes a raw Pathwisse event body.
 * Returns the parsed event, or an error message describing what's wrong with it.
 */
export function parsePathwisseEvent(body: unknown): ParsedPathwisseEvent | string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;

  if (typeof b.event_id !== "string" || b.event_id.length === 0) {
    return "event_id is required";
  }

  if (typeof b.event_type !== "string" || !isKnownEventType(b.event_type)) {
    return `event_type must be one of: ${Object.keys(CREDENTIAL_TYPE_BY_EVENT_TYPE).join(", ")}`;
  }

  if (typeof b.pathwisse_user_id !== "string" || b.pathwisse_user_id.length === 0) {
    return "pathwisse_user_id is required";
  }

  if (typeof b.occurred_at !== "string" || Number.isNaN(Date.parse(b.occurred_at))) {
    return "occurred_at must be an ISO timestamp string";
  }

  if (typeof b.title !== "string" || b.title.length === 0) {
    return "title is required";
  }

  if (b.score !== undefined && b.score !== null && typeof b.score !== "number") {
    return "score must be a number if present";
  }

  if (b.summary !== undefined && b.summary !== null && typeof b.summary !== "string") {
    return "summary must be a string if present";
  }

  return {
    eventId: b.event_id,
    eventType: b.event_type,
    pathwisseUserId: b.pathwisse_user_id,
    occurredAt: b.occurred_at,
    title: b.title,
    score: typeof b.score === "number" ? b.score : null,
    summary: typeof b.summary === "string" ? b.summary : null,
  };
}
