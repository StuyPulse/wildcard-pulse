-- One event drives the live workspace for each organization. Event IDs remain
-- internal; event_key is the stable human-facing route segment.
create unique index events_one_active_per_organization
  on public.events (organization_id) where status = 'active';

update public.events candidate
set status = 'active'
where candidate.id in (
  select distinct on (organization_id) id
  from public.events
  where not exists (select 1 from public.events active where active.organization_id = candidate.organization_id and active.status = 'active')
  order by organization_id, starts_at desc nulls last, created_at desc
);

alter table public.form_definitions
  add column if not exists form_type text not null default 'match'
  check (form_type in ('match', 'pre_scout', 'pit'));

create table public.scouting_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  match_id uuid references public.matches(id) on delete set null,
  assignment_id uuid references public.scouting_assignments(id) on delete set null,
  scout_user_id uuid not null references public.profiles(id) on delete restrict,
  entry_type text not null check (entry_type in ('match', 'pre_scout', 'pit')),
  form_version integer not null check (form_version > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status public.submission_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  check ((status = 'submitted' and submitted_at is not null) or status <> 'submitted')
);
create index scouting_entries_event_team_idx on public.scouting_entries(event_id, team_id, entry_type, submitted_at desc);
create index scouting_entries_match_idx on public.scouting_entries(match_id, entry_type);
create trigger scouting_entries_updated_at before update on public.scouting_entries for each row execute procedure public.set_updated_at();
alter table public.scouting_entries enable row level security;

create policy "members read scouting entries" on public.scouting_entries for select to authenticated
using (private.is_organization_member(organization_id));
create policy "members add scouting entries" on public.scouting_entries for insert to authenticated
with check (scout_user_id = (select auth.uid()) and private.is_organization_member(organization_id));
create policy "authors update drafts" on public.scouting_entries for update to authenticated
using (scout_user_id = (select auth.uid()) and status = 'draft')
with check (scout_user_id = (select auth.uid()) and private.is_organization_member(organization_id));
create policy "admins manage scouting entries" on public.scouting_entries for all to authenticated
using (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]))
with check (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]));

create table public.team_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger team_notes_updated_at before update on public.team_notes for each row execute procedure public.set_updated_at();
alter table public.team_notes enable row level security;
create policy "members read team notes" on public.team_notes for select to authenticated using (private.is_organization_member(organization_id));
create policy "members add team notes" on public.team_notes for insert to authenticated with check (author_id = (select auth.uid()) and private.is_organization_member(organization_id));
create policy "authors update team notes" on public.team_notes for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

grant select, insert, update, delete on public.scouting_entries, public.team_notes to authenticated;
alter publication supabase_realtime add table public.scouting_entries, public.team_notes;
