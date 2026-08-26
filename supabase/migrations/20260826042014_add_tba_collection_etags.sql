-- TBA issues ETags per endpoint. The event record can be unchanged while its
-- participant list or schedule changes, so a single ETag is not sufficient.
alter table public.events add column tba_teams_etag text;
alter table public.events add column tba_matches_etag text;
