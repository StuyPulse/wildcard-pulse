-- 2026 REBUILT refresh: retain only payloads supported by the current forms.
-- The match form is being replaced wholesale. Existing reports use its old
-- field map, so discard every old match report rather than mixing schemas in
-- the strategist table.
delete from public.scouting_entries where entry_type = 'match';

-- Global scouting is now a single event document, not a team-entry form.
delete from public.scouting_entries where entry_type = 'global';
delete from public.form_definitions where form_type = 'global';

-- Climb is sourced from FIRST data. Remove obsolete manually-scouted values.
update public.scouting_entries
set payload = case
  when entry_type = 'pit' then payload - 'climb'
  when entry_type = 'pre_scout' then payload - 'tower'
  else payload
end
where (entry_type = 'pit' and payload ? 'climb')
   or (entry_type = 'pre_scout' and payload ? 'tower');

alter table public.scouting_entries
  drop constraint if exists scouting_entries_entry_type_check;
alter table public.scouting_entries
  add constraint scouting_entries_entry_type_check
  check (entry_type in ('match', 'pre_scout', 'pit'));

alter table public.scouting_entries
  add constraint scouting_entries_match_payload_shape_check
  check (
    entry_type <> 'match'
    or (
      not (payload ? 'shifts')
      and not (payload ? 'climb')
      and (
        not (payload ? 'starting_spot')
        or payload ->> 'starting_spot' is null
        or payload ->> 'starting_spot' in ('position-1', 'position-2', 'position-3', 'position-4', 'position-5', 'position-6', 'position-7')
      )
    )
  );

alter table public.scouting_entries
  add constraint scouting_entries_pit_payload_shape_check
  check (entry_type <> 'pit' or not (payload ? 'climb'));

alter table public.scouting_entries
  add constraint scouting_entries_pre_scout_payload_shape_check
  check (entry_type <> 'pre_scout' or not (payload ? 'tower'));

alter table public.form_definitions
  drop constraint if exists form_definitions_form_type_check;
alter table public.form_definitions
  add constraint form_definitions_form_type_check
  check (form_type in ('match', 'pre_scout', 'pit'));

create table public.event_global_documents (
  event_id uuid primary key references public.events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_url text not null check (
    document_url ~ '^https://docs\\.google\\.com/(document|spreadsheets|presentation)/d/[A-Za-z0-9_-]+'
  ),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_global_documents_updated_at
before update on public.event_global_documents
for each row execute procedure public.set_updated_at();

alter table public.event_global_documents enable row level security;

create policy "members read event global documents"
on public.event_global_documents for select to authenticated
using (private.can_access_event(event_id));

create policy "strategists manage event global documents"
on public.event_global_documents for all to authenticated
using (
  private.has_organization_role(
    organization_id,
    array['admin','strategist','developer']::public.organization_role[]
  )
)
with check (
  updated_by = (select auth.uid())
  and private.has_organization_role(
    organization_id,
    array['admin','strategist','developer']::public.organization_role[]
  )
  and exists (
    select 1 from public.events e
    where e.id = event_id and e.organization_id = organization_id
  )
);

grant select, insert, update, delete on public.event_global_documents to authenticated;
alter publication supabase_realtime add table public.event_global_documents;
