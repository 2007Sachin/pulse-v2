"use client";

import Link from "next/link";
import { useState } from "react";
import type { PortfolioStatus } from "@/lib/publish";
import styles from "./PublishControl.module.css";

interface PublishResponse {
  status: PortfolioStatus;
  slug: string;
}

/**
 * Publish flow (T3.4): confirms/edits the public slug and flips
 * portfolio_status between draft and published. This is the gate for the
 * public route (T3.2) — nothing is reachable at /{slug} until this action
 * succeeds (apps/api/src/portfolio/getPublishedPortfolio.ts).
 */
export function PublishControl({
  initialStatus,
  initialSlug,
  viewCount,
  shareClickCount,
}: {
  initialStatus: PortfolioStatus;
  initialSlug: string;
  viewCount: number;
  shareClickCount: number;
}) {
  const [status, setStatus] = useState<PortfolioStatus>(initialStatus);
  const [slug, setSlug] = useState(initialSlug);
  const [slugInput, setSlugInput] = useState(initialSlug);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/publish", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slugInput.trim() }),
      });

      const body = (await response.json()) as PublishResponse | { error?: string };

      if (!response.ok) {
        setError("error" in body && body.error ? body.error : "Failed to publish.");
        return;
      }

      const published = body as PublishResponse;
      setStatus(published.status);
      setSlug(published.slug);
      setSlugInput(published.slug);
    } finally {
      setPending(false);
    }
  }

  async function handleUnpublish() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/publish/unpublish", { method: "PUT" });
      const body = (await response.json()) as PublishResponse | { error?: string };

      if (!response.ok) {
        setError("error" in body && body.error ? body.error : "Failed to unpublish.");
        return;
      }

      setStatus((body as PublishResponse).status);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Publish</h2>
      <p className={styles.subtitle}>
        {status === "published"
          ? "Your portfolio is live. Anyone with the link can view it."
          : "Confirm your URL and publish when you're ready to share your portfolio."}
      </p>

      <div className={styles.formRow}>
        <span className={styles.slugPrefix}>pulse.app/</span>
        <input
          className={styles.slugInput}
          type="text"
          value={slugInput}
          onChange={(event) => setSlugInput(event.target.value)}
          disabled={pending}
          aria-label="Portfolio URL slug"
        />
      </div>

      <div className={styles.actions}>
        {status === "published" ? (
          <button type="button" className={styles.unpublishButton} onClick={handleUnpublish} disabled={pending}>
            {pending ? "Working…" : "Unpublish"}
          </button>
        ) : (
          <button type="button" className={styles.publishButton} onClick={handlePublish} disabled={pending}>
            {pending ? "Publishing…" : "Publish"}
          </button>
        )}

        {status === "published" && (
          <Link href={`/${slug}`} className={styles.viewLink} target="_blank" rel="noreferrer">
            View live page ↗
          </Link>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {status === "published" && (
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Views</dt>
            <dd>{viewCount}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Share clicks</dt>
            <dd>{shareClickCount}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
