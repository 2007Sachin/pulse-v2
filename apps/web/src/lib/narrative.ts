import { getApiUrl } from "./apiUrl";

// Must match apps/api/src/narrative/types.ts.
export const BIO_MAX_LENGTH = 280;
export const CAREER_INTENT_MAX_LENGTH = 140;

export interface Narrative {
  bio: string | null;
  careerIntent: string | null;
}

// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

/**
 * Fetches the signed-in candidate's Tier 3 narrative (short bio + career
 * intent) from the api service, forwarding the Pulse session cookie from
 * the incoming request. Returns empty fields if there's no session or the
 * request fails — "nothing written yet" is a normal, renderable state.
 */
export async function fetchNarrative(sessionCookieValue: string | undefined): Promise<Narrative> {
  if (!sessionCookieValue) {
    return { bio: null, careerIntent: null };
  }

  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/narrative`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionCookieValue}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return { bio: null, careerIntent: null };
  }

  return (await response.json()) as Narrative;
}
