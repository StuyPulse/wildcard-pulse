-- Manual events use the existing event/team/match tables, but never contact TBA.
-- Their generated route keys are stable internal identifiers, not external event keys.
alter table public.events
  add column is_manual boolean not null default false;

alter table public.events
  drop constraint events_event_key_check;

alter table public.events
  add constraint events_event_key_check check (
    event_key ~ '^[0-9]{4}[a-z0-9_]+$'
    or event_key ~ '^manual_[0-9a-f]{32}$'
  );

create index events_active_source_idx
  on public.events (organization_id, is_manual)
  where status = 'active';

comment on column public.events.is_manual is
  'True for locally managed practice, offseason, and scrimmage events that must not sync with The Blue Alliance.';
