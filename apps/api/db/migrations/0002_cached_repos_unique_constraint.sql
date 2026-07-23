-- T1.4: github-sync-worker upserts one row per (user, repo) on every sync
-- run. A unique constraint is required for `on conflict` to target the
-- right row instead of creating a fresh one each refresh.
alter table cached_repos
  add constraint cached_repos_user_id_repo_name_key unique (user_id, repo_name);
