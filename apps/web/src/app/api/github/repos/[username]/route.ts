import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
