"use client";

import { useState } from "react";
import styles from "./ShareButton.module.css";

/**
 * Basic analytics (T4.3): lets a visitor reshare the portfolio (native share
 * sheet where available — WhatsApp is the primary channel per
 * ARCHITECTURE.md §1 — falling back to copying the link) and records the
 * click. No identifying data is sent, just an increment against the
 * portfolio's slug.
 */
export function ShareButton({ slug, candidateName }: { slug: string; candidateName: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    fetch(`/api/portfolio/${encodeURIComponent(slug)}/share-click`, { method: "POST" }).catch(() => {
      // Best-effort: a failed click ping shouldn't block the actual share.
    });

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${candidateName} — Pulse v2`, url });
        return;
      } catch {
        // User canceled the share sheet or it failed — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied; nothing more we can do without a share sheet.
    }
  }

  return (
    <button type="button" className={styles.button} onClick={handleShare}>
      {copied ? "Link copied!" : "Share this portfolio"}
    </button>
  );
}
