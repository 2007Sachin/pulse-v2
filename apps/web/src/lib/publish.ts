export type PortfolioStatus = "draft" | "published";

export interface PublishStatus {
  status: PortfolioStatus;
  slug: string;
  /** Basic analytics (T4.3): lifetime counts, zero until first tracked. */
  viewCount: number;
  shareClickCount: number;
}

// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

const DEFAULT_STATUS: PublishStatus = { status: "draft", slug: "", viewCount: 0, shareClickCount: 0 };

/**
 * Fetches the signed-in candidate's publish status + current slug
 * (T3.4) from the api service, forwarding the Pulse session cookie.
 * Falls back to an unpublished, empty-slug state if there's no session,
 * no portfolio yet, or the request fails.
 */
export async function fetchPublishStatus(
  sessionCookieValue: string | undefined,
): Promise<PublishStatus> {
  if (!sessionCookieValue) {
    return DEFAULT_STATUS;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const response = await fetch(`${apiUrl}/publish`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionCookieValue}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return DEFAULT_STATUS;
  }

  return (await response.json()) as PublishStatus;
}
