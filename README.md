# Pulse v2

Pulse v2 is a structured, verified proof-of-work portfolio product for Pathwisse users. It turns a candidate's Pathwisse activity — Role Readiness Certificates, Skill Cards, Asha interview verdicts, and Skill Sprint completions — into a role-specific, recruiter-scannable public portfolio page, combined with candidate-authored project evidence (GitHub repos, case studies, outcomes).

Pulse v2 is a **standalone product** with its own codebase and public-facing surface, but it is **not a source of truth** — all verified credential data flows in from Pathwisse via a one-way sync. Candidates authenticate with their existing Pathwisse account; there is no separate signup.

## What this is not (v1 scope)
- Not a two-sided recruiter marketplace (no recruiter accounts, no talent feed, no matching engine) — that is a possible future phase, explicitly out of scope for v1.
- Not a general-purpose portfolio builder open to non-Pathwisse users.
- Not a resume builder — self-authored claims are visually and structurally separated from verified Pathwisse credentials at all times.

## Core idea
Three tiers on every portfolio page, in order of trust:
1. **Verified Proof** — pulled from Pathwisse, cannot be edited by the candidate (certificates, skill cards, interview verdict, sprint completions)
2. **Proof of Work** — role-specific project evidence, partly automated (GitHub public repo data), partly candidate-authored (outcome lines, case studies)
3. **Narrative** — short, optional, self-authored bio/context

See `ARCHITECTURE.md`, `SCHEMA.md`, and `TASKS.md` for the build plan.

## Repo structure

npm workspaces monorepo:

- `apps/web` — Next.js frontend (App Router, TypeScript)
- `apps/api` — Node/Express backend service (TypeScript)
- `packages/config` — shared TypeScript base config

## Development

```
npm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

npm run dev:web      # Next.js dev server
npm run dev:api      # backend dev server (tsx watch)

npm run lint
npm run format:check
npm run typecheck
npm run build
```

## Database

Postgres, schema defined in `SCHEMA.md`. Migrations and seed data live under `apps/api/db`.

```
# set DATABASE_URL in apps/api/.env first (see apps/api/.env.example)
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api
```

## Auth

Shared session with Pathwisse via token federation — see `docs/decisions/001-auth.md` for the decision
and `apps/api/src/auth` for the implementation (`POST /auth/session`, `GET /auth/session`,
`POST /auth/logout`). Requires `PATHWISSE_AUTH_SHARED_SECRET` and `SESSION_COOKIE_SECRET` in
`apps/api/.env`.

## Deployment

`apps/api` is a standalone, long-running Express server (`app.listen`, one process-wide
`pg.Pool`) — it is **not** structured as serverless functions and is **not** deployed to
Vercel. Only `apps/web` (the Next.js frontend) deploys to Vercel.

### apps/web → Vercel
- Set Vercel's project root directory to `apps/web` (or configure the monorepo build per
  Vercel's npm-workspaces docs) so `next build` runs against this package.
- Required env vars (Project Settings → Environment Variables, for Production **and**
  Preview): `NEXT_PUBLIC_API_URL` (the deployed `apps/api` URL), `ADMIN_DEBUG_SHARED_SECRET`
  (must match the value configured on `apps/api`). `NEXT_PUBLIC_API_URL` is read at build
  time as well as runtime (Next.js collects route data during `next build`) — the build
  fails immediately with `NEXT_PUBLIC_API_URL must be set in production` if it's missing,
  by design (see `apps/web/src/lib/apiUrl.ts`).
- No custom `vercel.json` is needed — there's no cron job or redirect/header config that
  Next.js's own `next.config.ts` `headers()` doesn't already cover.
- Custom domain / HTTPS: configure in the Vercel dashboard as usual; no repo-side change
  needed.

### apps/api → a separate long-running host
Deploy `apps/api` anywhere that runs a persistent Node process — Render, Railway,
Fly.io, or a VM — using `npm run build --workspace=apps/api` then
`npm run start --workspace=apps/api`. Required env vars: `DATABASE_URL` (prefer your
provider's *pooled* connection string), `PATHWISSE_AUTH_SHARED_SECRET`,
`SESSION_COOKIE_SECRET`, `PATHWISSE_EVENTS_SHARED_SECRET`, `GITHUB_API_TOKEN`,
`ADMIN_DEBUG_SHARED_SECRET`, `NODE_ENV=production` (see `apps/api/.env.example` — the
server throws a clear startup error if any of these are missing).

### Migrations — manual, never automatic on deploy
There is no migrate-on-deploy hook anywhere in this repo (`apps/api`'s `build`/`start`
scripts only compile/run the server). Run migrations yourself before or during each
deploy, against the same `DATABASE_URL` the deployed `apps/api` will use:
```
npm run db:migrate --workspace=apps/api
```
Do this as a manual step or a separate CI job — never wire it into `apps/api`'s
`postinstall`/`build`/`start`, since running migrations from every serverless-adjacent
build or from multiple concurrently-starting instances is a real risk of concurrent,
partial schema changes.

### github-sync-worker — scheduled job on apps/api's host, not Vercel Cron
`npm run sync:github-repos --workspace=apps/api` is a one-shot script (opens a DB pool,
runs, exits) that needs `DATABASE_URL` and `GITHUB_API_TOKEN`. Since `apps/api` isn't on
Vercel, this should run on a schedule wherever `apps/api` is hosted — e.g. Render/Railway
native cron jobs, a scheduled GitHub Actions workflow, or a plain crontab entry — rather
than as a Vercel Cron Job. A Vercel Cron Job must hit an HTTP route on the Vercel
deployment, which would mean re-exposing this DB-writing script as a public-ish endpoint
on `apps/web` and duplicating logic that already lives cleanly in `apps/api`, for no
benefit.
