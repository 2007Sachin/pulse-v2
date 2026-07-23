import { cookies } from "next/headers";
import { fetchVerifiedCredentials } from "@/lib/credentials";
import { fetchFeaturedProjects } from "@/lib/featuredProjects";
import { fetchNarrative } from "@/lib/narrative";
import { fetchPublishStatus } from "@/lib/publish";
import { FeaturedProjectEditor } from "./FeaturedProjectEditor";
import { NarrativeTier } from "./NarrativeTier";
import { GitHubConnectStep } from "./GitHubConnectStep";
import { PortfolioPreview } from "./PortfolioPreview";
import { PublishControl } from "./PublishControl";
import { VerifiedProofTier } from "./VerifiedProofTier";
import { PortfolioView } from "@/portfolio/PortfolioView";

export const metadata = {
  title: "Portfolio builder — Pulse v2",
};

export default async function BuilderPage() {
  const cookieStore = await cookies();
  const sessionCookieValue = cookieStore.get("pulse_session")?.value;
  const [credentials, narrative, featuredProjects, publishStatus] = await Promise.all([
    fetchVerifiedCredentials(sessionCookieValue),
    fetchNarrative(sessionCookieValue),
    fetchFeaturedProjects(sessionCookieValue),
    fetchPublishStatus(sessionCookieValue),
  ]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Build your portfolio</h1>
      <VerifiedProofTier credentials={credentials} />
      <NarrativeTier narrative={narrative} />
      <GitHubConnectStep initialGithubUsername={featuredProjects.githubUsername} />
      <FeaturedProjectEditor
        roleTemplate={featuredProjects.roleTemplate}
        githubUsername={featuredProjects.githubUsername}
        initialProjects={featuredProjects.projects}
      />
      <PortfolioPreview>
        <PortfolioView
          roleTemplate={featuredProjects.roleTemplate}
          credentials={credentials}
          projects={featuredProjects.projects}
          narrative={narrative}
        />
      </PortfolioPreview>
      <PublishControl initialStatus={publishStatus.status} initialSlug={publishStatus.slug} />
    </main>
  );
}
