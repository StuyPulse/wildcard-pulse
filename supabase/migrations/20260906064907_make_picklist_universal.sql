begin;

-- Preserve every personal list. One random contributor's complete list per
-- event seeds a new shared board that all users will see and edit.
create table public.shared_picklist_rankings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  category_id uuid references public.picklist_categories(id) on delete set null,
  rank integer check (rank is null or rank >= 1),
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, team_id)
);

create index shared_picklist_rankings_event_rank_idx on public.shared_picklist_rankings(event_id, rank nulls last);
create index shared_picklist_rankings_updated_by_idx on public.shared_picklist_rankings(updated_by);
create trigger shared_picklist_rankings_updated_at before update on public.shared_picklist_rankings for each row execute procedure public.set_updated_at();
alter table public.shared_picklist_rankings enable row level security;

create temporary table universal_picklist_sources on commit drop as
select distinct on (event_id) event_id, user_id
from public.picklist_rankings
order by event_id, random();

insert into public.shared_picklist_rankings (organization_id, event_id, team_id, category_id, rank, note, created_by, updated_by, created_at, updated_at)
select ranking.organization_id, ranking.event_id, ranking.team_id, ranking.category_id, ranking.rank, ranking.note, ranking.user_id, ranking.user_id, ranking.created_at, ranking.updated_at
from public.picklist_rankings as ranking
join universal_picklist_sources as source on source.event_id = ranking.event_id and source.user_id = ranking.user_id;

create policy "organization members read shared picklist" on public.shared_picklist_rankings
  for select to authenticated
  using (private.is_organization_member(organization_id));

create policy "picklist collaborators create shared rankings" on public.shared_picklist_rankings
  for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[])
  );

create policy "picklist collaborators update shared rankings" on public.shared_picklist_rankings
  for update to authenticated
  using (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]))
  with check (
    updated_by = (select auth.uid())
    and private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[])
  );

create policy "picklist collaborators delete shared rankings" on public.shared_picklist_rankings
  for delete to authenticated
  using (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));

create table public.picklist_change_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('baseline','created','updated','deleted')),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index picklist_change_log_event_created_idx on public.picklist_change_log(event_id, created_at desc);
alter table public.picklist_change_log enable row level security;
create policy "organization members read picklist change log" on public.picklist_change_log
  for select to authenticated
  using (private.is_organization_member(organization_id));

create function private.log_shared_picklist_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_state jsonb;
  new_state jsonb;
begin
  if tg_op = 'INSERT' then
    new_state := jsonb_build_object('rank', new.rank, 'category_id', new.category_id, 'note', new.note);
    insert into public.picklist_change_log (organization_id, event_id, team_id, actor_user_id, action, after_state)
      values (new.organization_id, new.event_id, new.team_id, auth.uid(), 'created', new_state);
    return new;
  end if;

  old_state := jsonb_build_object('rank', old.rank, 'category_id', old.category_id, 'note', old.note);
  new_state := jsonb_build_object('rank', new.rank, 'category_id', new.category_id, 'note', new.note);
  if old_state is distinct from new_state then
    insert into public.picklist_change_log (organization_id, event_id, team_id, actor_user_id, action, before_state, after_state)
      values (new.organization_id, new.event_id, new.team_id, auth.uid(), 'updated', old_state, new_state);
  end if;
  return new;
end;
$$;

create trigger shared_picklist_change_log
after insert or update on public.shared_picklist_rankings
for each row execute procedure private.log_shared_picklist_change();
revoke execute on function private.log_shared_picklist_change() from public, anon, authenticated;

insert into public.picklist_change_log (organization_id, event_id, team_id, actor_user_id, action, after_state)
select organization_id, event_id, team_id, created_by, 'baseline', jsonb_build_object('rank', rank, 'category_id', category_id, 'note', note)
from public.shared_picklist_rankings;

grant select, insert, update, delete on public.shared_picklist_rankings to authenticated;
grant select on public.picklist_change_log to authenticated;
alter publication supabase_realtime add table public.shared_picklist_rankings, public.picklist_change_log;

commit;
