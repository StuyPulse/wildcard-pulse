-- Keep the public profile useful for assignment and admin screens. Auth metadata
-- is copied only at account creation; it is never used for authorization.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.profiles
  add constraint profiles_first_name_length check (first_name is null or char_length(first_name) between 1 and 40),
  add constraint profiles_last_name_length check (last_name is null or char_length(last_name) between 1 and 60);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  new_first_name text;
  new_last_name text;
  new_display_name text;
  stuy_pulse_organization_id uuid;
begin
  new_first_name := nullif(left(coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name', ''), 40), '');
  new_last_name := nullif(left(coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'family_name', ''), 60), '');
  new_display_name := coalesce(
    nullif(trim(concat_ws(' ', new_first_name, new_last_name)), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80), ''),
    nullif(left(split_part(new.email, '@', 1), 80), ''),
    'PulseCrew'
  );

  insert into public.profiles (id, display_name, first_name, last_name)
  values (new.id, new_display_name, new_first_name, new_last_name);

  -- Wildcard Pulse currently has one team organization. Every permitted new
  -- account joins it as a Scout; administrators can promote members later.
  select id into stuy_pulse_organization_id
  from public.organizations
  where name = 'StuyPulse'
  order by created_at
  limit 1;

  if stuy_pulse_organization_id is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (stuy_pulse_organization_id, new.id, 'scout')
    on conflict (organization_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Improve existing Google-backed profile labels when Google supplied names.
update public.profiles p
set
  first_name = coalesce(p.first_name, nullif(left(u.raw_user_meta_data ->> 'given_name', 40), '')),
  last_name = coalesce(p.last_name, nullif(left(u.raw_user_meta_data ->> 'family_name', 60), '')),
  display_name = coalesce(
    nullif(trim(concat_ws(' ', nullif(left(u.raw_user_meta_data ->> 'given_name', 40), ''), nullif(left(u.raw_user_meta_data ->> 'family_name', 60), ''))), ''),
    nullif(left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), 80), ''),
    p.display_name
  )
from auth.users u
where u.id = p.id;

-- Keep at least one administrator in each organization, even if a request
-- bypasses the application UI.
create or replace function private.prevent_last_admin_removal()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') and not exists (
    select 1 from public.organization_members
    where organization_id = old.organization_id
      and role = 'admin'
      and user_id <> old.user_id
  ) then
    raise exception 'Each organization must retain at least one admin.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists prevent_last_admin_removal_before_update on public.organization_members;
create trigger prevent_last_admin_removal_before_update
before update on public.organization_members
for each row execute procedure private.prevent_last_admin_removal();

drop trigger if exists prevent_last_admin_removal_before_delete on public.organization_members;
create trigger prevent_last_admin_removal_before_delete
before delete on public.organization_members
for each row execute procedure private.prevent_last_admin_removal();

revoke all on function private.prevent_last_admin_removal() from public;
grant usage on schema private to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;
