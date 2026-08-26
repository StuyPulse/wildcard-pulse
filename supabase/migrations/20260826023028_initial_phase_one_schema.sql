-- Wildcard Pulse, Phase 1: multi-tenant scouting foundation.
-- Every public table is protected with RLS. Authorization is based only on
-- organization_members, never editable Auth user metadata.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create type public.organization_role as enum ('admin', 'scout', 'strategist', 'master', 'developer');
create type public.match_type as enum ('qualification', 'playoff', 'practice');
create type public.event_status as enum ('draft', 'upcoming', 'active', 'completed', 'archived');
create type public.match_status as enum ('scheduled', 'in_progress', 'complete', 'played', 'cancelled');
create type public.assignment_type as enum ('objective', 'subjective', 'pit', 'strategist');
create type public.assignment_status as enum ('pending', 'in_progress', 'complete', 'skipped');
create type public.submission_status as enum ('draft', 'submitted', 'corrected', 'invalid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  event_key text not null check (event_key ~ '^[0-9]{4}[a-z0-9_]+$'),
  starts_at timestamptz,
  ends_at timestamptz,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_key),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_number integer not null check (team_number > 0 and team_number < 100000),
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, team_number)
);

create table public.event_teams (
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, team_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  match_number integer not null check (match_number > 0),
  match_type public.match_type not null default 'qualification',
  red_teams uuid[] not null default '{}',
  blue_teams uuid[] not null default '{}',
  scheduled_at timestamptz,
  status public.match_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, match_type, match_number),
  check (cardinality(red_teams) <= 3 and cardinality(blue_teams) <= 3),
  check (not red_teams && blue_teams)
);

create table public.form_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  version integer not null check (version > 0),
  schema_json jsonb not null check (jsonb_typeof(schema_json) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, version)
);

create table public.scouting_assignments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  scout_user_id uuid not null references public.profiles(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  assignment_type public.assignment_type not null,
  status public.assignment_status not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (match_id, scout_user_id, team_id, assignment_type),
  check ((status = 'complete') = (completed_at is not null))
);

create table public.match_submissions (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  scout_user_id uuid not null references public.profiles(id) on delete restrict,
  assignment_id uuid not null references public.scouting_assignments(id) on delete restrict,
  form_version integer not null check (form_version > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status public.submission_status not null default 'draft',
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (assignment_id),
  check ((status = 'submitted' and submitted_at is not null) or status <> 'submitted')
);

create table public.submission_photos (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.match_submissions(id) on delete cascade,
  storage_path text not null unique check (storage_path like '%/%'),
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index events_organization_idx on public.events(organization_id, starts_at desc);
create index teams_organization_number_idx on public.teams(organization_id, team_number);
create index matches_event_schedule_idx on public.matches(event_id, scheduled_at, match_number);
create index assignments_scout_status_idx on public.scouting_assignments(scout_user_id, status);
create index assignments_match_team_idx on public.scouting_assignments(match_id, team_id);
create index submissions_event_team_idx on public.match_submissions(event_id, team_id, submitted_at desc);
create index submissions_match_idx on public.match_submissions(match_id);

create or replace function private.is_organization_member(target_organization uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = target_organization and m.user_id = (select auth.uid()));
$$;

create or replace function private.has_organization_role(target_organization uuid, allowed_roles public.organization_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = target_organization and m.user_id = (select auth.uid()) and m.role = any(allowed_roles));
$$;

create or replace function private.shares_organization(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_user = (select auth.uid()) or exists (
    select 1 from public.organization_members mine join public.organization_members theirs using (organization_id)
    where mine.user_id = (select auth.uid()) and theirs.user_id = target_user
  );
$$;

create or replace function private.can_access_event(target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event and (
      private.has_organization_role(e.organization_id, array['admin','strategist','developer']::public.organization_role[])
      or exists (select 1 from public.scouting_assignments a join public.matches m on m.id = a.match_id where m.event_id = e.id and a.scout_user_id = (select auth.uid()))
    )
  );
$$;

create or replace function private.can_manage_event(target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = target_event and private.has_organization_role(e.organization_id, array['admin','developer']::public.organization_role[]));
$$;

create or replace function private.can_read_submission(target_submission uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.match_submissions s join public.events e on e.id = s.event_id
    where s.id = target_submission and (s.scout_user_id = (select auth.uid()) or private.has_organization_role(e.organization_id, array['admin','strategist','developer']::public.organization_role[]))
  );
$$;

revoke all on all functions in schema private from public;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 80), ''), nullif(left(split_part(new.email, '@', 1), 80), ''), 'PulseCrew'));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
create trigger events_updated_at before update on public.events for each row execute procedure public.set_updated_at();
create trigger teams_updated_at before update on public.teams for each row execute procedure public.set_updated_at();
create trigger matches_updated_at before update on public.matches for each row execute procedure public.set_updated_at();
create trigger form_definitions_updated_at before update on public.form_definitions for each row execute procedure public.set_updated_at();
create trigger match_submissions_updated_at before update on public.match_submissions for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.event_teams enable row level security;
alter table public.matches enable row level security;
alter table public.form_definitions enable row level security;
alter table public.scouting_assignments enable row level security;
alter table public.match_submissions enable row level security;
alter table public.submission_photos enable row level security;

create policy "profiles readable by teammates" on public.profiles for select to authenticated using (private.shares_organization(id));
create policy "profiles update self" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "organizations readable by members" on public.organizations for select to authenticated using (private.is_organization_member(id));
create policy "organizations updated by admins" on public.organizations for update to authenticated using (private.has_organization_role(id, array['admin','developer']::public.organization_role[])) with check (private.has_organization_role(id, array['admin','developer']::public.organization_role[]));
create policy "members readable by teammates" on public.organization_members for select to authenticated using (private.is_organization_member(organization_id));
create policy "members managed by admins" on public.organization_members for all to authenticated using (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[])) with check (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]));
create policy "events visible by assignment or role" on public.events for select to authenticated using (private.can_access_event(id));
create policy "events managed by admins" on public.events for all to authenticated using (private.can_manage_event(id)) with check (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]));
create policy "teams visible in accessible events" on public.teams for select to authenticated using (exists (select 1 from public.event_teams et where et.team_id = id and private.can_access_event(et.event_id)) or private.has_organization_role(organization_id, array['admin','strategist','developer']::public.organization_role[]));
create policy "teams managed by admins" on public.teams for all to authenticated using (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[])) with check (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]));
create policy "event teams visible with event" on public.event_teams for select to authenticated using (private.can_access_event(event_id));
create policy "event teams managed by admins" on public.event_teams for all to authenticated using (private.can_manage_event(event_id)) with check (private.can_manage_event(event_id));
create policy "matches visible with event" on public.matches for select to authenticated using (private.can_access_event(event_id));
create policy "matches managed by admins" on public.matches for all to authenticated using (private.can_manage_event(event_id)) with check (private.can_manage_event(event_id));
create policy "forms readable by members" on public.form_definitions for select to authenticated using (private.is_organization_member(organization_id));
create policy "forms managed by admins" on public.form_definitions for all to authenticated using (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[])) with check (private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]));
create policy "assignments visible to scout or managers" on public.scouting_assignments for select to authenticated using (scout_user_id = (select auth.uid()) or private.can_manage_event((select m.event_id from public.matches m where m.id = match_id)) or exists (select 1 from public.matches m join public.events e on e.id = m.event_id where m.id = match_id and private.has_organization_role(e.organization_id, array['strategist']::public.organization_role[])));
create policy "assignments managed by admins" on public.scouting_assignments for all to authenticated using (private.can_manage_event((select m.event_id from public.matches m where m.id = match_id))) with check (private.can_manage_event((select m.event_id from public.matches m where m.id = match_id)));
create policy "submissions readable by owner or analysts" on public.match_submissions for select to authenticated using (private.can_read_submission(id));
create policy "scouts insert assigned submissions" on public.match_submissions for insert to authenticated with check (scout_user_id = (select auth.uid()) and exists (select 1 from public.scouting_assignments a where a.id = assignment_id and a.match_id = match_id and a.team_id = team_id and a.scout_user_id = (select auth.uid())) and exists (select 1 from public.matches m where m.id = match_id and m.event_id = event_id));
create policy "scouts update own drafts" on public.match_submissions for update to authenticated using (scout_user_id = (select auth.uid()) and status = 'draft') with check (scout_user_id = (select auth.uid()) and status = 'draft');
create policy "admins correct submissions" on public.match_submissions for update to authenticated using (private.can_manage_event(event_id)) with check (private.can_manage_event(event_id));
create policy "photos readable with submission" on public.submission_photos for select to authenticated using (private.can_read_submission(submission_id));
create policy "scouts attach own photos" on public.submission_photos for insert to authenticated with check (exists (select 1 from public.match_submissions s where s.id = submission_id and s.scout_user_id = (select auth.uid())));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scouting-photos', 'scouting-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "private scouting photos readable with submission" on storage.objects for select to authenticated using (bucket_id = 'scouting-photos' and exists (select 1 from public.submission_photos p where p.storage_path = name and private.can_read_submission(p.submission_id)));
create policy "scouts upload own submission photos" on storage.objects for insert to authenticated with check (bucket_id = 'scouting-photos' and exists (select 1 from public.match_submissions s where s.scout_user_id = (select auth.uid()) and name like s.id::text || '/%'));
create policy "scouts replace own submission photos" on storage.objects for update to authenticated using (bucket_id = 'scouting-photos' and exists (select 1 from public.match_submissions s where s.scout_user_id = (select auth.uid()) and name like s.id::text || '/%')) with check (bucket_id = 'scouting-photos' and exists (select 1 from public.match_submissions s where s.scout_user_id = (select auth.uid()) and name like s.id::text || '/%'));
create policy "scouts delete own submission photos" on storage.objects for delete to authenticated using (bucket_id = 'scouting-photos' and exists (select 1 from public.match_submissions s where s.scout_user_id = (select auth.uid()) and name like s.id::text || '/%'));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_submissions') then
    alter publication supabase_realtime add table public.match_submissions;
  end if;
end $$;
