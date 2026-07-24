import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();
// Must match SESSION_COOKIE_NAME in apps/api/src/auth/constants.ts.
const SESSION_COOKIE_NAME = "pulse_session";

// Same-origin proxy that forwards the Pulse session cookie so the api
// service can authenticate the "connect GitHub username" action (T2.3).
export async function PUT(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body: unknown = await req.json();

  const response = await fetch(`${API_URL}/github/username`, {
    method: "PUT",
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
