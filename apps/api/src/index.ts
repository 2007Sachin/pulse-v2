import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import { createAuthRouter } from "./auth/router.js";

const app = express();
const port = process.env.PORT ?? 4000;

const pathwisseSharedSecret = process.env.PATHWISSE_AUTH_SHARED_SECRET;
const sessionSecret = process.env.SESSION_COOKIE_SECRET;

if (!pathwisseSharedSecret || !sessionSecret) {
  throw new Error("PATHWISSE_AUTH_SHARED_SECRET and SESSION_COOKIE_SECRET must both be set");
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

app.listen(port, () => {
  console.log(`api listening on port ${port}`);
});
