import { VerifiedProofTier } from "@/app/builder/VerifiedProofTier";
import type { VerifiedCredential } from "@/lib/credentials";
import type { FeaturedProject } from "@/lib/featuredProjects";
import type { Narrative } from "@/lib/narrative";
import { ProjectCard, type ProjectCardData } from "@/role-templates/ProjectCard";
import type { RoleTemplate } from "@/role-templates/fields";
import { NarrativeView } from "./NarrativeView";
import styles from "./PortfolioView.module.css";

export interface PortfolioViewData {
  candidateName?: string | null;
  roleTemplate: RoleTemplate | null;
  credentials: VerifiedCredential[];
  projects: FeaturedProject[];
  narrative: Narrative;
}

function toProjectCardData(project: FeaturedProject): ProjectCardData {
  return {
    title: project.title,
    outcomeLine: project.outcomeLine,
    caseStudy: project.caseStudy,
    roleSpecificFields: project.roleSpecificFields,
  };
}

/**
 * The canonical public portfolio rendering — all three tiers, read-only.
 * This is the single source of truth for how a portfolio looks: the builder
 * preview (T2.6) and the eventual public page (T3.2) both render this exact
 * component, so a preview is a true preview, not a separate mockup. It reuses
 * the real Tier 1 component (VerifiedProofTier) and the T3.1 role-template
 * ProjectCard renderer rather than reimplementing them.
 */
export function PortfolioView({
  candidateName,
  roleTemplate,
  credentials,
  projects,
  narrative,
}: PortfolioViewData) {
  return (
    <article className={styles.portfolio}>
      {candidateName && <h1 className={styles.name}>{candidateName}</h1>}

      <VerifiedProofTier credentials={credentials} />

      <section className={styles.projects} aria-labelledby="portfolio-projects-heading">
        <h2 id="portfolio-projects-heading" className={styles.sectionTitle}>
          Projects
        </h2>
        {projects.length === 0 ? (
          <p className={styles.emptyProjects}>No featured projects yet.</p>
        ) : (
          <div className={styles.projectList}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                roleTemplate={roleTemplate ?? "early_career"}
                project={toProjectCardData(project)}
              />
            ))}
          </div>
        )}
      </section>

      <NarrativeView narrative={narrative} />
    </article>
  );
}
