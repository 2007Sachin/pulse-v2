/**
 * Hook for T3.3 (OG preview / share card generation for WhatsApp-optimized
 * link previews), which hasn't been built yet. `publishPortfolio` calls this
 * exactly once, right after a portfolio successfully flips to `published`,
 * so the trigger point already exists wherever T3.3 lands.
 *
 * TODO(T3.3): generate/refresh the OG image + metadata for this user's
 * public portfolio page (candidate name, headline credential, role
 * template) and persist it somewhere the public route can serve without
 * regenerating per request. Currently a no-op.
 */
export async function triggerShareCardGeneration(_userId: string): Promise<void> {
  // Intentionally empty until T3.3 lands.
}
