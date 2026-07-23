-- T4.1: tracks when the candidate last shared/published their portfolio, so
-- the re-share prompt can tell "new verified credential since I last shared"
-- apart from "credential that was already visible when I last shared."
-- Set on every publish (including re-publish) and whenever the candidate
-- dismisses the prompt without re-publishing.
alter table users
  add column last_shared_at timestamptz;
