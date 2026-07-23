import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE_NAME } from "./constants.js";
import { verifySessionToken, type PulseSessionClaims } from "./session.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: PulseSessionClaims;
    }
  }
}

export function requireAuth(sessionSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];

    if (typeof token !== "string") {
      res.status(401).json({ error: "not authenticated" });
      return;
    }

    try {
      req.auth = verifySessionToken(token, sessionSecret);
      next();
    } catch {
      res.status(401).json({ error: "invalid or expired session" });
    }
  };
}
