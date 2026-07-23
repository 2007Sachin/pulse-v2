"use client";

import { useState, type ReactNode } from "react";
import styles from "./PortfolioPreview.module.css";

/**
 * Preview mode (T2.6). Toggles the exact public page rendering inside the
 * authenticated builder before publish (ARCHITECTURE.md §6 step 4). The
 * `children` are a server-rendered <PortfolioView> — the same component the
 * public page (T3.2) will use — so this is a true preview of persisted data,
 * not a separate mockup. Only the show/hide toggle is client-side; the
 * portfolio itself stays server-rendered.
 */
export function PortfolioPreview({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Preview</h2>
          <p className={styles.subtitle}>See exactly what the public page will show before you publish.</p>
        </div>
        <button type="button" className={styles.toggle} onClick={() => setOpen((value) => !value)}>
          {open ? "Hide preview" : "Show preview"}
        </button>
      </div>

      {open && (
        <div className={styles.frame}>
          <p className={styles.frameLabel}>Public view</p>
          {children}
        </div>
      )}
    </section>
  );
}
