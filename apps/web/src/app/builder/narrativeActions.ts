"use server";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/apiUrl";
import type { Narrative } from "@/lib/narrative";

// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

export interface NarrativeFormState {
  status: "idle" | "success" | "error";
  message: string | null;
  narrative: Narrative;
}

/**
 * Server action backing the Narrative tier form (T2.5). Forwards the
 * submitted bio/career intent to the api service's PUT /narrative, which is
 * the authoritative source of the character-limit validation — this action
 * just relays whatever it says.
 */
export async function saveNarrativeAction(
  previousState: NarrativeFormState,
  formData: FormData,
): Promise<NarrativeFormState> {
  const bio = String(formData.get("bio") ?? "");
  const careerIntent = String(formData.get("careerIntent") ?? "");

  const cookieStore = await cookies();
  const sessionCookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookieValue) {
    return {
      status: "error",
      message: "You need to be signed in to save your narrative.",
      narrative: previousState.narrative,
    };
  }

  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/narrative`, {
    method: "PUT",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${sessionCookieValue}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ bio, careerIntent }),
  });

  const body = (await response.json().catch(() => null)) as
    | Narrative
    | { error: string }
    | null;

  if (!response.ok) {
    const message = body && "error" in body ? body.error : "Failed to save your narrative.";
    return { status: "error", message, narrative: { bio, careerIntent } };
  }

  return {
    status: "success",
    message: "Saved.",
    narrative: (body as Narrative) ?? { bio, careerIntent },
  };
}
