# Pulse v2 — Architecture

## 1. Product summary

Pulse v2 shows a Pathwisse user's verified skill/interview credentials plus self-curated project evidence, on a public, shareable, role-specific portfolio page. Primary distribution channel is WhatsApp (share links, OG preview cards), consistent with Pathwisse's existing B2C motion.

Audience: Pathwisse users only, v1. Standalone product, but credential data is one-way synced in from Pathwisse — Pathwisse remains system of record for all verified data.

## 2. High-level system shape

```
┌─────────────┐        events         ┌──────────────┐
│  Pathwisse   │ ────────────────────▶ │   Pulse v2    │
│ (system of   │  (cert issued, sprint │ (presentation │
│   record)    │   completed, verdict  │  + candidate- │
│              │   scored)             │  authored     │
└─────────────┘                        │  content)     │
                                        └──────┬────────┘
                                               │
                                        ┌──────▼────────┐
                                        │  GitHub API    │
                                        │ (public repo   │
                                        │  data, via     │
                                        │  Pulse's own   │
                                        │  server token) │
                                        └────────────────┘
```

- **Auth**: shared with Pathwisse. A Pathwisse account is a Pulse v2 account. No independent signup flow in v1. Exact mechanism (shared Supabase Auth session, or federated via Cognito if/when AWS migration happens) to be decided at implementation time — architecture should not hard-code assumptions that block either path.
- **Data sync**: event-driven, one-way (Pathwisse → Pulse v2). Pathwisse emits events on: certificate issued, skill card earned, sprint completed, interview verdict scored. Pulse v2 consumes and stores its own denormalized copy for fast read/render. Pulse v2 never writes back to Pathwisse's data.
- **GitHub integration**: username-only, no OAuth in v1. Pulse v2 backend holds its own GitHub token (server-side, not per-user) to fetch public repo data on the candidate's behalf, respecting GitHub's higher authenticated rate limit. Fetched data is cached in Pulse v2's own DB and refreshed on a schedule (not fetched live per page view).

## 3. Services (v1, minimal)

Keep this lean — v1 does not need six microservices. Suggested split:

1. **web-app** — Next.js frontend: portfolio builder (authenticated) + public portfolio page (unauthenticated, shareable)
2. **api** — backend service: auth session handling, portfolio CRUD, event ingestion from Pathwisse, GitHub fetch orchestration
3. **github-sync-worker** — scheduled background job: refreshes cached GitHub repo data per user on an interval (e.g. daily)
4. **event-consumer** — ingests Pathwisse events (certificate/sprint/verdict) and writes to Pulse v2's own DB

These can start as a single deployable service with clear internal module boundaries (api + github-sync-worker + event-consumer as one app with a cron trigger) and be split out later if load requires it. Do not over-engineer service separation before there is real traffic.

## 4. Content model (see SCHEMA.md for tables)

### Tier 1 — Verified Proof (read-only to candidate, sourced from Pathwisse events)
- Role Readiness Certificate: role, score, date issued
- Skill Cards: skill name, date earned
- Asha Interview Verdict: readiness score, one-line strength/gap summary, date
- Skill Sprint completions: sprint name, completion date

### Tier 2 — Proof of Work (role-specific, mixed automated + authored)
- Project cards, fields vary by role template (see section 5)
- GitHub-sourced fields (repo name, description, language, stars, last updated, URL) are auto-populated, cached, refreshed periodically
- Outcome line, case study text, and which repos/projects to feature are candidate-authored

### Tier 3 — Narrative (fully self-authored, character-limited)
- Short bio / career intent
- Optional mentor/faculty endorsement (only if Pathwisse exposes that relationship data via an event/field)

## 5. Role templates (v1: 4–5 shapes, not per-JD-taxonomy-node)

Map Pathwisse's existing role taxonomy clusters down to these evidence shapes:

| Template | Project card fields |
|---|---|
| Software / Dev | repo link, tech stack tags, one metric (perf/scale/bug reduction), live demo link |
| Design | process shots, before/after, Figma link, problem statement |
| Marketing / Growth | campaign name, channel, one metric (CTR/CAC/reach), before/after |
| Product / PM | problem → decision → outcome trail |
| Data / Analyst | dataset/tool used, question answered, recommendation made |
| Early-career / Undecided (fallback) | generic project card: what you built, what you learned, one outcome |

The template shell (layout, verified-badge row, share card) is shared across all roles. Only the project-card field schema changes by role.

## 6. User flow (build order maps to TASKS.md)

1. Portfolio record auto-created (draft state) the first time a Pathwisse event is received for a user — no separate opt-in step.
2. Candidate is nudged to add 2–3 projects once verified data exists.
3. Candidate enters GitHub username (optional) → backend fetches + caches public repos → candidate selects which to feature → writes one-line outcome per project.
4. Candidate previews the exact public view before publishing.
5. Publish generates a shareable URL + WhatsApp-optimized OG preview card.
6. New verified events (new cert, new sprint) auto-update the live page and trigger an optional re-share prompt.

## 7. Explicit non-goals for v1
- No recruiter-side accounts, search, or matching.
- No OAuth-based private GitHub data.
- No candidate-to-candidate discovery/feed.
- No payments/gating logic (deferred — open decision on whether portfolio is free or tied to a paid tier).

## 8. Infra notes
- Start on whatever the team can ship fastest on (Supabase acceptable for v1 MVP); AWS migration (RDS/ECS Fargate) is a separate, later initiative and should not block getting a working v1 live.
- Avoid introducing a graph database or Neptune/AGE for v1 — not needed until there's a matching/recommendation feature, which is out of scope here.
