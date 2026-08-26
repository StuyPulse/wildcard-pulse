alter table public.events add column tba_etag text;
alter table public.events add column tba_last_synced_at timestamptz;
