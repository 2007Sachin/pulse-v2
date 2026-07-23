"use client";

import { useEffect, useRef } from "react";

/**
 * Basic analytics (T4.3): records exactly one view per real page load in a
 * visitor's browser. Deliberately client-side and separate from the data
 * fetch that renders the page — generateMetadata and the OG image route
 * (T3.3) both re-fetch the same portfolio server-side per request, and
 * counting there would overcount a single visit several times over.
 */
export function ViewTracker({ slug }: { slug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      return;
    }
    fired.current = true;

    fetch(`/api/portfolio/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => {
      // Best-effort: a failed view ping shouldn't affect the visitor's experience.
    });
  }, [slug]);

  return null;
}
