create table public.picklist_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.picklist_rankings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.picklist_categories(id) on delete set null,
  rank integer check (rank is null or rank >= 1),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, team_id, user_id)
);

create index picklist_categories_organization_order_idx on public.picklist_categories(organization_id, sort_order, name);
create index picklist_rankings_event_user_rank_idx on public.picklist_rankings(event_id, user_id, rank nulls last);
create index picklist_rankings_event_team_idx on public.picklist_rankings(event_id, team_id);

create trigger picklist_categories_updated_at before update on public.picklist_categories for each row execute procedure public.set_updated_at();
create trigger picklist_rankings_updated_at before update on public.picklist_rankings for each row execute procedure public.set_updated_at();

alter table public.picklist_categories enable row level security;
alter table public.picklist_rankings enable row level security;

create policy "picklist collaborators read categories" on public.picklist_categories for select to authenticated using (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));
create policy "picklist collaborators create categories" on public.picklist_categories for insert to authenticated with check (created_by = (select auth.uid()) and private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));
create policy "category owners and admins update categories" on public.picklist_categories for update to authenticated using (created_by = (select auth.uid()) or private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[])) with check (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));
create policy "category owners and admins delete categories" on public.picklist_categories for delete to authenticated using (created_by = (select auth.uid()) or private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]));

create policy "picklist collaborators read rankings" on public.picklist_rankings for select to authenticated using (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));
create policy "picklist collaborators create rankings" on public.picklist_rankings for insert to authenticated with check (user_id = (select auth.uid()) and private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));
create policy "ranking authors and admins update rankings" on public.picklist_rankings for update to authenticated using (user_id = (select auth.uid()) or private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[])) with check (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));
create policy "ranking authors and admins delete rankings" on public.picklist_rankings for delete to authenticated using (user_id = (select auth.uid()) or private.has_organization_role(organization_id, array['admin','developer']::public.organization_role[]));

grant select, insert, update, delete on public.picklist_categories, public.picklist_rankings to authenticated;
alter publication supabase_realtime add table public.picklist_categories, public.picklist_rankings;
