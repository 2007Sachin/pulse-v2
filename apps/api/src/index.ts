import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import { createAuthRouter } from "./auth/router.js";
import { createGitHubRouter } from "./github/router.js";

const app = express();
const port = process.env.PORT ?? 4000;

const pathwisseSharedSecret = process.env.PATHWISSE_AUTH_SHARED_SECRET;
const sessionSecret = process.env.SESSION_COOKIE_SECRET;
const githubApiToken = process.env.GITHUB_API_TOKEN;

if (!pathwisseSharedSecret || !sessionSecret) {
  throw new Error("PATHWISSE_AUTH_SHARED_SECRET and SESSION_COOKIE_SECRET must both be set");
}

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

app.use("/github", createGitHubRouter({ githubToken: githubApiToken }));

app.listen(port, () => {
  console.log(`api listening on port ${port}`);
});
