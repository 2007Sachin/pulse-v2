# Pulse v2 — Schema (v1)

Postgres. Kept intentionally lean — no recruiter-side tables in v1. Extend, don't redesign, when new needs appear.

## users
Mirrors identity from Pathwisse via shared auth. Not the source of truth for identity — just a local reference row.

| column | type | notes |
|---|---|---|
| id | uuid, PK | matches Pathwisse user id |
| pathwisse_user_id | text, unique | explicit foreign reference to Pathwisse |
| name | text | |
| role_template | text | one of: dev, design, marketing, product, data, early_career |
| github_username | text, nullable | candidate-entered |
| portfolio_status | text | draft / published |
| portfolio_slug | text, unique | public URL slug |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## verified_credentials
One row per verified event received from Pathwisse. Append-only; never edited by candidate.

| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| credential_type | text | certificate / skill_card / interview_verdict / sprint_completion |
| title | text | e.g. "Frontend Developer — Role Readiness Certificate" |
| score | numeric, nullable | applies to certificate / interview_verdict |
| summary | text, nullable | e.g. one-line strength/gap from Asha verdict |
| issued_at | timestamptz | |
| source_event_id | text, unique | idempotency key from Pathwisse event, prevents duplicate ingestion |
| created_at | timestamptz | |

## cached_repos
Populated by github-sync-worker from GitHub's public API. Refreshed on schedule, not on page view.

| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| repo_name | text | |
| repo_url | text | |
| description | text, nullable | |
| primary_language | text, nullable | |
| stars | integer | |
| last_updated_at | timestamptz | from GitHub |
| fetched_at | timestamptz | last time Pulse v2 refreshed this row |

## featured_projects
Candidate-curated, candidate-authored. This is Tier 2 content.

| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| source_type | text | github_repo / manual |
| cached_repo_id | uuid, FK → cached_repos.id, nullable | set if source_type = github_repo |
| title | text | |
| outcome_line | text | candidate-authored, one line, required |
| case_study | text, nullable | longer optional write-up |
| role_specific_fields | jsonb | shape varies by users.role_template — see ARCHITECTURE.md §5 |
| display_order | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## narrative
Tier 3. One row per user, optional.

| column | type | notes |
|---|---|---|
| user_id | uuid, PK, FK → users.id | |
| bio | text | character-limited at application layer |
| career_intent | text, nullable | |
| endorsement_text | text, nullable | only populated if sourced from a Pathwisse event |
| endorsement_source | text, nullable | e.g. mentor/faculty name, if applicable |
| updated_at | timestamptz | |

## sync_events_log
Audit/debug table for the Pathwisse → Pulse v2 event pipeline. Not shown to candidates.

| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| event_type | text | |
| payload | jsonb | raw event as received |
| processed_at | timestamptz, nullable | null = not yet processed |
| error | text, nullable | |
| received_at | timestamptz | |

## Notes for implementation
- `source_event_id` on `verified_credentials` and idempotency handling in `sync_events_log` matter more than almost anything else in this schema — duplicate event delivery must not create duplicate credentials on a candidate's page.
- No RLS design included here deliberately — decide this once auth mechanism (shared Supabase session vs. Cognito-federated) is locked, since the RLS approach differs significantly between the two.
- `role_specific_fields` is jsonb by design so template field changes don't require a migration per role.
