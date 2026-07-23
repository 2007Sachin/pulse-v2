import { Router } from "express";
import { SESSION_COOKIE_MAX_AGE_MS, SESSION_COOKIE_NAME } from "./constants.js";
import { requireAuth } from "./middleware.js";
import { verifyPathwisseToken } from "./pathwisseToken.js";
import { signSessionToken } from "./session.js";

export interface AuthRouterConfig {
  pathwisseSharedSecret: string;
  sessionSecret: string;
  cookieSecure: boolean;
}

export function createAuthRouter(config: AuthRouterConfig): Router {
  const router = Router();

  // Exchanges a Pathwisse-issued handoff token for a Pulse session cookie.
  router.post("/session", (req, res) => {
    const token: unknown = req.body?.token;

    if (typeof token !== "string" || token.length === 0) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    let claims;
    try {
      claims = verifyPathwisseToken(token, config.pathwisseSharedSecret);
    } catch {
      res.status(401).json({ error: "invalid or expired token" });
      return;
    }

    const sessionToken = signSessionToken(
      { pathwisseUserId: claims.sub, name: claims.name },
      config.sessionSecret,
    );

    res.cookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });

    res.json({ pathwisseUserId: claims.sub, name: claims.name });
  });

  router.get("/session", requireAuth(config.sessionSecret), (req, res) => {
    res.json(req.auth);
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.status(204).send();
  });

  return router;
}
