import { NextRequest, NextResponse } from "next/server";

import { getApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();

// Same-origin proxy so the client-side GitHub connect form (T2.3) can call
// the api service without needing CORS wired up there.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const response = await fetch(`${API_URL}/github/repos/${encodeURIComponent(username)}`, {
    cache: "no-store",
  });

  const body: unknown = await response.json();
  return NextResponse.json(body, { status: response.status });
}
