-- T0.2: initial schema, implementing all tables from SCHEMA.md.

create extension if not exists pgcrypto;

-- users
-- Mirrors identity from Pathwisse via shared auth. Not the source of truth for
-- identity — just a local reference row.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  pathwisse_user_id text not null unique,
  name text not null,
  role_template text not null check (
    role_template in ('dev', 'design', 'marketing', 'product', 'data', 'early_career')
  ),
  github_username text,
  portfolio_status text not null default 'draft' check (portfolio_status in ('draft', 'published')),
  portfolio_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- verified_credentials
-- One row per verified event received from Pathwisse. Append-only; never
-- edited by candidate.
create table if not exists verified_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  credential_type text not null check (
    credential_type in ('certificate', 'skill_card', 'interview_verdict', 'sprint_completion')
  ),
  title text not null,
  score numeric,
  summary text,
  issued_at timestamptz not null,
  source_event_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists verified_credentials_user_id_idx on verified_credentials (user_id);

-- cached_repos
-- Populated by github-sync-worker from GitHub's public API. Refreshed on
-- schedule, not on page view.
create table if not exists cached_repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  repo_name text not null,
  repo_url text not null,
  description text,
  primary_language text,
  stars integer not null default 0,
  last_updated_at timestamptz,
  fetched_at timestamptz not null default now()
);

create index if not exists cached_repos_user_id_idx on cached_repos (user_id);

-- featured_projects
-- Candidate-curated, candidate-authored. This is Tier 2 content.
create table if not exists featured_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  source_type text not null check (source_type in ('github_repo', 'manual')),
  cached_repo_id uuid references cached_repos (id) on delete set null,
  title text not null,
  outcome_line text not null,
  case_study text,
  role_specific_fields jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists featured_projects_user_id_idx on featured_projects (user_id);

-- narrative
-- Tier 3. One row per user, optional.
create table if not exists narrative (
  user_id uuid primary key references users (id) on delete cascade,
  bio text,
  career_intent text,
  endorsement_text text,
  endorsement_source text,
  updated_at timestamptz not null default now()
);

-- sync_events_log
-- Audit/debug table for the Pathwisse → Pulse v2 event pipeline. Not shown
-- to candidates.
create table if not exists sync_events_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now()
);
