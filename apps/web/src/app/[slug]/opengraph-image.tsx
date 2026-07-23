import { ImageResponse } from "next/og";
import { fetchPublicPortfolio } from "@/lib/portfolio";
import { getRoleTemplateLabel } from "@/role-templates/fields";

export const alt = "Pulse v2 verified portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ImageProps {
  params: Promise<{ slug: string }>;
}

// WhatsApp-optimized OG share card (T3.3), generated off the same public
// portfolio data T3.2's page renders (ARCHITECTURE.md §6 step 5: "Publish
// generates a shareable URL + WhatsApp-optimized OG preview card"). Next.js
// wires this up as the page's og:image automatically via the
// opengraph-image file convention — no manual <meta> tag needed for the
// image itself.
export default async function OpengraphImage({ params }: ImageProps) {
  const { slug } = await params;
  const portfolio = await fetchPublicPortfolio(slug);

  if (!portfolio) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f7f8fa",
            fontSize: 40,
            color: "#5c6470",
          }}
        >
          Pulse v2
        </div>
      ),
      size,
    );
  }

  const verifiedCount = portfolio.credentials.length;
  const roleLabel = portfolio.roleTemplate ? getRoleTemplateLabel(portfolio.roleTemplate) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#eefaf6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#0f6b5c",
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 700,
              borderRadius: 999,
              padding: "8px 20px",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            ✓ Verified by Pathwisse
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#063a3a" }}>
            {portfolio.candidateName}
          </div>
          {roleLabel && (
            <div style={{ marginTop: 12, fontSize: 32, color: "#0f6b5c", fontWeight: 600 }}>
              {roleLabel}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32, fontSize: 26, color: "#16181d" }}>
          <div style={{ display: "flex" }}>
            {verifiedCount} verified credential{verifiedCount === 1 ? "" : "s"}
          </div>
          <div style={{ display: "flex" }}>
            {portfolio.projects.length} featured project{portfolio.projects.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
