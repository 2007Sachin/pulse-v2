import { Router } from "express";
import type { Pool } from "pg";
import { getPublishedPortfolio } from "./getPublishedPortfolio.js";

export interface PortfolioRouterConfig {
  pool: Pool;
}

// Public portfolio page (T3.2): unauthenticated GET by portfolio_slug. Only
// published portfolios are servable here — a draft in progress isn't
// publicly reachable at its eventual URL until the publish flow (T3.4) flips
// portfolio_status. Whether the slug doesn't exist or just isn't published
// yet, this returns the same 404 rather than leaking which is the case.
export function createPortfolioRouter(config: PortfolioRouterConfig): Router {
  const router = Router();

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

  return router;
}
