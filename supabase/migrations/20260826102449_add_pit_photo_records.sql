create table if not exists public.pit_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  storage_path text not null unique,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.pit_photos enable row level security;

create policy "Organization members can read pit photo records" on public.pit_photos for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = pit_photos.organization_id and m.user_id = (select auth.uid()))
);
create policy "Organization members can record their uploads" on public.pit_photos for insert to authenticated with check (
  uploaded_by = (select auth.uid()) and exists (select 1 from public.organization_members m where m.organization_id = pit_photos.organization_id and m.user_id = (select auth.uid()))
);

alter publication supabase_realtime add table public.pit_photos;
