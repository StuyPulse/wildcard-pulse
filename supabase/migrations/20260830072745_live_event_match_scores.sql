alter table public.events
  add column tba_live_matches_etag text,
  add column tba_last_live_synced_at timestamptz,
  add column tba_live_sync_started_at timestamptz;

alter table public.matches
  add column red_score integer check (red_score is null or red_score >= 0),
  add column blue_score integer check (blue_score is null or blue_score >= 0),
  add column actual_at timestamptz,
  add column tba_score_breakdown jsonb not null default '{}'::jsonb check (jsonb_typeof(tba_score_breakdown) = 'object');

create index matches_event_status_scheduled_idx
  on public.matches (event_id, status, scheduled_at);
