import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicPortfolio } from "@/lib/portfolio";
import { PortfolioView } from "@/portfolio/PortfolioView";
import { getRoleTemplateLabel } from "@/role-templates/fields";
import { ShareButton } from "./ShareButton";
import { ViewTracker } from "./ViewTracker";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function buildDescription(portfolio: NonNullable<Awaited<ReturnType<typeof fetchPublicPortfolio>>>): string {
  if (portfolio.narrative.careerIntent) {
    return portfolio.narrative.careerIntent;
  }
  if (portfolio.narrative.bio) {
    return portfolio.narrative.bio;
  }
  const roleLabel = portfolio.roleTemplate ? getRoleTemplateLabel(portfolio.roleTemplate) : null;
  return roleLabel
    ? `${roleLabel} portfolio with verified credentials from Pathwisse.`
    : "A portfolio with verified credentials from Pathwisse.";
}

// Sets the WhatsApp-optimized share metadata (T3.3) for this page —
// og:title/description/type here, og:image via the sibling
// opengraph-image.tsx file convention. Both are built off the exact same
// fetchPublicPortfolio data the page body renders, per ARCHITECTURE.md §6
// step 5 ("Publish generates a shareable URL + WhatsApp-optimized OG
// preview card").
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await fetchPublicPortfolio(slug);

  if (!portfolio) {
    return { title: "Pulse v2" };
  }

  const title = `${portfolio.candidateName} — Pulse v2`;
  const description = buildDescription(portfolio);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Public portfolio page (T3.2): the unauthenticated route at a candidate's
 * portfolio_slug. Renders the exact same PortfolioView the builder's preview
 * (T2.6) renders — same component, same tiers, same T3.1 role-template
 * layout — so there's nothing bespoke to this route beyond fetching by slug
 * and gating on portfolio_status = published (enforced by the api; see
 * fetchPublicPortfolio).
 */
export default async function PublicPortfolioPage({ params }: PageProps) {
  const { slug } = await params;
  const portfolio = await fetchPublicPortfolio(slug);

  if (!portfolio) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <ViewTracker slug={slug} />
      <PortfolioView
        candidateName={portfolio.candidateName}
        roleTemplate={portfolio.roleTemplate}
        credentials={portfolio.credentials}
        projects={portfolio.projects}
        narrative={portfolio.narrative}
      />
      <ShareButton slug={slug} candidateName={portfolio.candidateName} />
    </main>
  );
}
