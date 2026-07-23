import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicPortfolio } from "@/lib/portfolio";
import { PortfolioView } from "@/portfolio/PortfolioView";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await fetchPublicPortfolio(slug);

  if (!portfolio) {
    return { title: "Pulse v2" };
  }

  return { title: `${portfolio.candidateName} — Pulse v2` };
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
      <PortfolioView
        candidateName={portfolio.candidateName}
        roleTemplate={portfolio.roleTemplate}
        credentials={portfolio.credentials}
        projects={portfolio.projects}
        narrative={portfolio.narrative}
      />
    </main>
  );
}
