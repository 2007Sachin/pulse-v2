"use client";

import { useState } from "react";
import styles from "./ReSharePrompt.module.css";

interface ReSharePromptProps {
  initialShouldPrompt: boolean;
  newCredentialCount: number;
  slug: string;
}

/**
 * Re-share prompt (T4.1): "your portfolio was updated" — surfaced when a new
 * verified credential has arrived for an already-published candidate
 * (ARCHITECTURE.md §6 step 6). Renders nothing once dismissed or if there's
 * nothing new to report.
 */
export function ReSharePrompt({ initialShouldPrompt, newCredentialCount, slug }: ReSharePromptProps) {
  const [visible, setVisible] = useState(initialShouldPrompt);
  const [dismissing, setDismissing] = useState(false);

  async function dismiss() {
    setDismissing(true);
    try {
      await fetch("/api/reshare/dismiss", { method: "PUT" });
    } finally {
      setVisible(false);
      setDismissing(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>
        Your portfolio was updated — <strong>{newCredentialCount}</strong> new verified credential
        {newCredentialCount === 1 ? "" : "s"} since you last shared it.
      </p>
      <div className={styles.actions}>
        <a
          className={styles.reshareLink}
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            void dismiss();
          }}
        >
          View & share again ↗
        </a>
        <button type="button" className={styles.dismissButton} onClick={dismiss} disabled={dismissing}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
