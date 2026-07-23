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
