import { getApiUrl } from "./apiUrl";

// Matches SCHEMA.md's verified_credentials.credential_type values.
export type CredentialType = "certificate" | "skill_card" | "interview_verdict" | "sprint_completion";

export interface VerifiedCredential {
  id: string;
  credentialType: CredentialType;
  title: string;
  score: number | null;
  summary: string | null;
  issuedAt: string;
}

// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

/**
 * Fetches the signed-in candidate's verified credentials from the api
 * service, forwarding the Pulse session cookie from the incoming request.
 * Returns an empty list if there's no session or the request fails —
 * the builder page treats "no verified proof yet" as a normal, renderable
 * state rather than an error.
 */
export async function fetchVerifiedCredentials(sessionCookieValue: string | undefined): Promise<
  VerifiedCredential[]
> {
  if (!sessionCookieValue) {
    return [];
  }

  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/credentials`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionCookieValue}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as { credentials: VerifiedCredential[] };
  return body.credentials;
}
