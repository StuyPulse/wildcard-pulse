begin;

-- A single existing contributor's list becomes the initial shared list for
-- each event. This intentionally discards the parallel personal variants.
create temporary table universal_picklist_sources on commit drop as
select distinct on (event_id) event_id, user_id
from public.picklist_rankings
order by event_id, random();

delete from public.picklist_rankings as ranking
using universal_picklist_sources as source
where ranking.event_id = source.event_id
  and ranking.user_id <> source.user_id;

alter table public.picklist_rankings
  add column updated_by uuid references public.profiles(id) on delete restrict;

update public.picklist_rankings set updated_by = user_id;

alter table public.picklist_rankings
  rename column user_id to created_by;

alter table public.picklist_rankings
  alter column updated_by set not null;

alter table public.picklist_rankings
  drop constraint if exists picklist_rankings_event_id_team_id_user_id_key;

alter table public.picklist_rankings
  add constraint picklist_rankings_event_team_key unique (event_id, team_id);

drop index if exists public.picklist_rankings_event_user_rank_idx;
create index picklist_rankings_event_rank_idx on public.picklist_rankings(event_id, rank nulls last);
create index picklist_rankings_updated_by_idx on public.picklist_rankings(updated_by);

drop policy if exists "organization members read picklist rankings" on public.picklist_rankings;
drop policy if exists "picklist collaborators read rankings" on public.picklist_rankings;
drop policy if exists "picklist collaborators create rankings" on public.picklist_rankings;
drop policy if exists "ranking authors and admins update rankings" on public.picklist_rankings;
drop policy if exists "ranking authors and admins delete rankings" on public.picklist_rankings;

create policy "organization members read universal picklist" on public.picklist_rankings
  for select to authenticated
  using (private.is_organization_member(organization_id));

create policy "picklist collaborators create universal rankings" on public.picklist_rankings
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[])
  );

create policy "picklist collaborators update universal rankings" on public.picklist_rankings
  for update to authenticated
  using (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]))
  with check (
    updated_by = (select auth.uid())
    and private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[])
  );

create policy "picklist collaborators delete universal rankings" on public.picklist_rankings
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

create function public.log_universal_picklist_change()
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

create trigger universal_picklist_change_log
after insert or update on public.picklist_rankings
for each row execute procedure public.log_universal_picklist_change();

insert into public.picklist_change_log (organization_id, event_id, team_id, actor_user_id, action, after_state)
select organization_id, event_id, team_id, created_by, 'baseline', jsonb_build_object('rank', rank, 'category_id', category_id, 'note', note)
from public.picklist_rankings;

grant select on public.picklist_change_log to authenticated;
alter publication supabase_realtime add table public.picklist_change_log;

commit;
