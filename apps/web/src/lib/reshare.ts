export interface ReshareStatus {
  shouldPrompt: boolean;
  newCredentialCount: number;
}

// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

const NO_PROMPT: ReshareStatus = { shouldPrompt: false, newCredentialCount: 0 };

/**
 * Fetches the re-share prompt status (T4.1) for the signed-in candidate —
 * whether a new verified credential has arrived since they last published
 * or dismissed the prompt. Falls back to "don't prompt" if there's no
 * session or the request fails, same as the other builder data fetchers.
 */
export async function fetchReshareStatus(
  sessionCookieValue: string | undefined,
): Promise<ReshareStatus> {
  if (!sessionCookieValue) {
    return NO_PROMPT;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/reshare`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionCookieValue}` },
      cache: "no-store",
    });
  } catch {
    return NO_PROMPT;
  }

  if (!response.ok) {
    return NO_PROMPT;
  }

  return (await response.json()) as ReshareStatus;
}
