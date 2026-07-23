import type { Narrative } from "@/lib/narrative";
import styles from "./PortfolioView.module.css";

/**
 * Tier 3 — Narrative, read-only public rendering. The builder's NarrativeTier
 * is the editable form; this is the display counterpart the public page (T3.2)
 * and the builder preview (T2.6) share. Renders nothing when the candidate
 * hasn't written anything — an empty narrative section shouldn't appear on the
 * public page.
 */
export function NarrativeView({ narrative }: { narrative: Narrative }) {
  if (!narrative.bio && !narrative.careerIntent) {
    return null;
  }

  return (
    <section className={styles.narrative} aria-labelledby="portfolio-narrative-heading">
      <h2 id="portfolio-narrative-heading" className={styles.sectionTitle}>
        About
      </h2>
      {narrative.bio && <p className={styles.bio}>{narrative.bio}</p>}
      {narrative.careerIntent && <p className={styles.careerIntent}>{narrative.careerIntent}</p>}
    </section>
  );
}
