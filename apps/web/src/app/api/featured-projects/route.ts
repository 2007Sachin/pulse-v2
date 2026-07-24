import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();
// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

// Same-origin proxy so the featured-project editor (T2.4) can create projects
// against the api service, forwarding the Pulse session cookie for auth.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body: unknown = await req.json();

  const response = await fetch(`${API_URL}/featured-projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const responseBody: unknown = await response.json();
  return NextResponse.json(responseBody, { status: response.status });
}
