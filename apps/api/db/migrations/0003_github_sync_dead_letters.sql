-- T4.2: github-sync-worker records failed per-user syncs here instead of
-- only logging them, so a failure survives past the worker process for
-- manual review/replay.
create table if not exists github_sync_dead_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  github_username text not null,
  error text not null,
  attempts integer not null default 1,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists github_sync_dead_letters_user_id_idx on github_sync_dead_letters (user_id);
create index if not exists github_sync_dead_letters_unresolved_idx
  on github_sync_dead_letters (created_at)
  where resolved_at is null;
