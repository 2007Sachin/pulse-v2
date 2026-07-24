import { NextRequest, NextResponse } from "next/server";

import { getApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();

// Same-origin proxy so the public page's share button (T4.3) can ping the
// api service without needing CORS wired up there. Unauthenticated, like
// the page itself.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const response = await fetch(`${API_URL}/portfolio/${encodeURIComponent(slug)}/share-click`, {
    method: "POST",
    cache: "no-store",
  });

  return new NextResponse(null, { status: response.status });
}
