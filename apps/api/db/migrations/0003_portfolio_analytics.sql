-- T4.3: basic analytics — aggregate view + share-click counts per user.
-- Deliberately just counters, created lazily on the first tracked event.
-- No per-viewer identifying data (IP, user agent, referrer) is stored, so
-- there's no PII beyond what's already public on the portfolio page itself.
create table if not exists portfolio_analytics (
  user_id uuid primary key references users (id) on delete cascade,
  view_count integer not null default 0,
  share_click_count integer not null default 0,
  updated_at timestamptz not null default now()
);
