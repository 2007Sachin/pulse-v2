import type { CredentialType, VerifiedCredential } from "@/lib/credentials";
import styles from "./VerifiedProofTier.module.css";

// Order and labels follow ARCHITECTURE.md §4's Tier 1 list.
const GROUPS: { type: CredentialType; label: string }[] = [
  { type: "certificate", label: "Role Readiness Certificates" },
  { type: "skill_card", label: "Skill Cards" },
  { type: "interview_verdict", label: "Asha Interview Verdicts" },
  { type: "sprint_completion", label: "Skill Sprint Completions" },
];

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CheckBadgeIcon() {
  return (
    <svg
      className={styles.checkIcon}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Tier 1 — Verified Proof. Read-only: nothing here is editable by the
 * candidate, matching verified_credentials being append-only in SCHEMA.md.
 * Visual treatment is intentionally distinct from candidate-authored tiers
 * (see VerifiedProofTier.module.css) — this is the product's core
 * differentiator, not incidental styling.
 */
export function VerifiedProofTier({ credentials }: { credentials: VerifiedCredential[] }) {
  const groups = GROUPS.map((group) => ({
    ...group,
    items: credentials.filter((credential) => credential.credentialType === group.type),
  })).filter((group) => group.items.length > 0);

  return (
    <section className={styles.tier} aria-labelledby="verified-proof-heading">
      <div className={styles.tierHeader}>
        <span className={styles.tierBadge}>
          <CheckBadgeIcon />
          Verified
        </span>
      </div>
      <h2 id="verified-proof-heading" className={styles.tierTitle}>
        Verified Proof
      </h2>
      <p className={styles.tierSubtitle}>Sourced directly from Pathwisse. You can&apos;t edit this.</p>

      {groups.length === 0 ? (
        <p className={styles.emptyState} style={{ marginTop: 20 }}>
          No verified credentials yet. This section fills in automatically as Pathwisse reports
          certificates, skill cards, sprint completions, and interview verdicts.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.type} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.label}</h3>
            <div className={styles.cardList}>
              {group.items.map((credential) => (
                <article key={credential.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{credential.title}</span>
                    {credential.score !== null && (
                      <span className={styles.cardScore}>{credential.score}</span>
                    )}
                  </div>
                  {credential.summary && <p className={styles.cardSummary}>{credential.summary}</p>}
                  <p className={styles.cardMeta}>Issued {formatDate(credential.issuedAt)}</p>
                </article>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
