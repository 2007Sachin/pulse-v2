import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import { createAuthRouter } from "./auth/router.js";
import { createCredentialsRouter } from "./credentials/router.js";
import { createDbPool } from "./db/pool.js";
import { createEventsRouter } from "./events/router.js";
import { createGitHubRouter } from "./github/router.js";
import { createNarrativeRouter } from "./narrative/router.js";

const app = express();
const port = process.env.PORT ?? 4000;

const pathwisseSharedSecret = process.env.PATHWISSE_AUTH_SHARED_SECRET;
const sessionSecret = process.env.SESSION_COOKIE_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const pathwisseEventsSharedSecret = process.env.PATHWISSE_EVENTS_SHARED_SECRET;
const githubApiToken = process.env.GITHUB_API_TOKEN;

if (!pathwisseSharedSecret || !sessionSecret) {
  throw new Error("PATHWISSE_AUTH_SHARED_SECRET and SESSION_COOKIE_SECRET must both be set");
}

if (!databaseUrl || !pathwisseEventsSharedSecret) {
  throw new Error("DATABASE_URL and PATHWISSE_EVENTS_SHARED_SECRET must both be set");
}

const dbPool = createDbPool(databaseUrl);

if (!githubApiToken) {
  throw new Error("GITHUB_API_TOKEN must be set");
}

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  "/auth",
  createAuthRouter({
    pathwisseSharedSecret,
    sessionSecret,
    cookieSecure: process.env.NODE_ENV === "production",
  }),
);

app.use(
  "/events",
  createEventsRouter({
    pool: dbPool,
    sharedSecret: pathwisseEventsSharedSecret,
  }),
);
app.use(
  "/github",
  createGitHubRouter({ githubToken: githubApiToken, pool: dbPool, sessionSecret }),
);

app.use(
  "/credentials",
  createCredentialsRouter({
    pool: dbPool,
    sessionSecret,
  }),
);

app.use(
  "/narrative",
  createNarrativeRouter({
    pool: dbPool,
    sessionSecret,
  }),
);

app.listen(port, () => {
  console.log(`api listening on port ${port}`);
});
