import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Same-origin proxy so the public page's view tracker (T4.3) can ping the
// api service without needing CORS wired up there. Unauthenticated, like
// the page itself.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const response = await fetch(`${API_URL}/portfolio/${encodeURIComponent(slug)}/view`, {
    method: "POST",
    cache: "no-store",
  });

  return new NextResponse(null, { status: response.status });
}
