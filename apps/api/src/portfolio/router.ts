import { Router } from "express";
import type { Pool } from "pg";
import { recordPortfolioShareClick, recordPortfolioView } from "./analyticsService.js";
import { findPublishedUserId } from "./findPublishedUserId.js";
import { getPublishedPortfolio } from "./getPublishedPortfolio.js";

export interface PortfolioRouterConfig {
  pool: Pool;
}

export function createPortfolioRouter(config: PortfolioRouterConfig): Router {
  const router = Router();

  // Public portfolio page (T3.2): unauthenticated GET by portfolio_slug. Only
  // published portfolios are servable here — a draft in progress isn't
  // publicly reachable at its eventual URL until the publish flow (T3.4) flips
  // portfolio_status. Whether the slug doesn't exist or just isn't published
  // yet, this returns the same 404 rather than leaking which is the case.
  router.get("/:slug", async (req, res) => {
    const { slug } = req.params;

    try {
      const portfolio = await getPublishedPortfolio(config.pool, slug);

      if (!portfolio) {
        res.status(404).json({ error: "portfolio not found" });
        return;
      }

      res.json(portfolio);
    } catch (error) {
      console.error(`failed to load public portfolio for slug ${slug}`, error);
      res.status(500).json({ error: "internal error loading portfolio" });
    }
  });

  // Basic analytics (T4.3): fired once per public page load from the
  // browser (apps/web/src/portfolio/ViewTracker.tsx), not from the server
  // fetches that build the page (those happen multiple times per request —
  // generateMetadata, the OG image route — and would overcount a single visit).
  router.post("/:slug/view", async (req, res) => {
    const { slug } = req.params;

    try {
      const userId = await findPublishedUserId(config.pool, slug);
      if (!userId) {
        res.status(404).json({ error: "portfolio not found" });
        return;
      }

      await recordPortfolioView(config.pool, userId);
      res.status(204).send();
    } catch (error) {
      console.error(`failed to record view for slug ${slug}`, error);
      res.status(500).json({ error: "internal error recording view" });
    }
  });

  // Basic analytics (T4.3): fired when a visitor clicks the public page's
  // share button (apps/web/src/portfolio/ShareButton.tsx).
  router.post("/:slug/share-click", async (req, res) => {
    const { slug } = req.params;

    try {
      const userId = await findPublishedUserId(config.pool, slug);
      if (!userId) {
        res.status(404).json({ error: "portfolio not found" });
        return;
      }

      await recordPortfolioShareClick(config.pool, userId);
      res.status(204).send();
    } catch (error) {
      console.error(`failed to record share click for slug ${slug}`, error);
      res.status(500).json({ error: "internal error recording share click" });
    }
  });

  return router;
}
