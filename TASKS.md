# Pulse v2 — Task Backlog

Ordered so each task is independently buildable and reviewable as its own PR. Read `ARCHITECTURE.md` and `SCHEMA.md` before starting any task below. Do not skip ahead to a later task before its dependencies (noted) are merged.

## Phase 0 — Scaffold
- [x] **T0.1** Repo scaffold: Next.js frontend app, Node backend service, shared TypeScript config, linting/formatting setup, env var structure (no secrets committed). No feature logic yet.
- [ ] **T0.2** Postgres schema migration implementing all tables in `SCHEMA.md`. Include seed script with 2-3 fake users across different `role_template` values for local dev/testing.
- [ ] **T0.3** CI: basic lint + typecheck + test run on PR.

## Phase 1 — Data foundations
- [ ] **T1.1** Auth integration: shared session with Pathwisse (decide and document mechanism first — Supabase shared session vs. token federation — before implementing). Depends on: T0.1.
- [ ] **T1.2** Event ingestion endpoint: receives Pathwisse events (certificate issued, skill card earned, sprint completed, interview verdict scored), writes to `sync_events_log`, processes into `verified_credentials` with idempotency via `source_event_id`. Depends on: T0.2.
- [ ] **T1.3** GitHub public-repo fetch service: given a username, calls GitHub's public API using Pulse v2's own server-side token, returns normalized repo list. Unit tests with mocked API responses. Depends on: T0.1.
- [ ] **T1.4** `github-sync-worker`: scheduled job that iterates users with a `github_username` set, calls T1.3's fetch service, upserts into `cached_repos`. Depends on: T1.3, T0.2.

## Phase 2 — Candidate-facing build flow
- [ ] **T2.1** Portfolio auto-creation: on first received event for a new user (via T1.2), create a `users` row + draft `portfolio_status` if one doesn't exist. Depends on: T1.2.
- [ ] **T2.2** Portfolio builder UI — Verified Proof tier: read-only display of `verified_credentials`, grouped by type, styled distinctly (see ARCHITECTURE.md §4). Depends on: T1.2, T0.1.
- [ ] **T2.3** Portfolio builder UI — GitHub connect step: username input with live validation (calls T1.3), fetched repo list displayed for selection. Depends on: T1.3.
- [ ] **T2.4** Portfolio builder UI — Featured project editor: candidate selects a repo (or adds manual entry), fills `outcome_line` + role-specific fields (form shape driven by `role_template`), writes to `featured_projects`. Depends on: T2.3, T0.2.
- [ ] **T2.5** Portfolio builder UI — Narrative tier: short bio + career intent form, character-limited. Depends on: T0.2.
- [ ] **T2.6** Preview mode: renders the exact public page view within the authenticated builder, before publish. Depends on: T2.2, T2.4, T2.5.

## Phase 3 — Public page + templates
- [ ] **T3.1** Role template engine: given `role_template`, render the correct project-card field layout per ARCHITECTURE.md §5. Build as a shared component consumed by both preview (T2.6) and public page. Depends on: T0.1.
- [ ] **T3.2** Public portfolio page: unauthenticated route at portfolio slug, renders all three tiers using T3.1's template engine. Mobile-first layout. Depends on: T3.1, T2.6.
- [ ] **T3.3** OG preview / share card generation for WhatsApp-optimized link previews. Depends on: T3.2.
- [ ] **T3.4** Publish flow: draft → published state toggle, generates/confirms slug, triggers T3.3. Depends on: T3.2.

## Phase 4 — Polish + ops
- [ ] **T4.1** Re-share prompt: on new verified credential arriving for an already-published user, surface a "your portfolio was updated" notification/prompt. Depends on: T1.2, T3.4.
- [ ] **T4.2** Rate-limit and error handling hardening on GitHub fetch (T1.3) — respect GitHub API limits, backoff/retry, dead-letter failed syncs for manual review.
- [ ] **T4.3** Basic analytics: portfolio view counts, share link click tracking (no PII beyond what's already public).
- [ ] **T4.4** Admin/debug view for `sync_events_log` — surface unprocessed/errored events for manual investigation.

## Explicitly deferred (do not build in v1)
- Recruiter accounts, talent feed, or any matching/search logic
- OAuth-based GitHub integration for private repo data
- Payment/gating logic for portfolio access
- Any graph database (Neptune/AGE) — not needed until a recommendation feature exists
