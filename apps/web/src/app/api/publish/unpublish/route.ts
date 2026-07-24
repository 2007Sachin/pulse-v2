import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();
// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

// Same-origin proxy that forwards the Pulse session cookie so the api
// service can authenticate the unpublish action (T3.4).
export async function PUT(_req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const response = await fetch(`${API_URL}/publish/unpublish`, {
    method: "PUT",
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}` },
    cache: "no-store",
  });

  const responseBody: unknown = await response.json();
  return NextResponse.json(responseBody, { status: response.status });
}
