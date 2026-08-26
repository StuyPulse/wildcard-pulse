-- Auth triggers execute under a restricted database role. Store the selected
-- organization in the private schema so onboarding does not depend on a public
-- table read that is filtered by RLS during first sign-in.
create table if not exists private.wildcard_configuration (
  setting_key text primary key,
  default_organization_id uuid not null references public.organizations(id) on delete restrict
);

insert into private.wildcard_configuration (setting_key, default_organization_id)
select 'default_organization', id
from public.organizations
where name = 'StuyPulse'
order by created_at
limit 1
on conflict (setting_key) do update set default_organization_id = excluded.default_organization_id;

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

  select default_organization_id into stuy_pulse_organization_id
  from private.wildcard_configuration
  where setting_key = 'default_organization';
  if stuy_pulse_organization_id is null then
    raise exception 'Wildcard Pulse has no configured default organization.' using errcode = '23514';
  end if;
  insert into public.organization_members (organization_id, user_id, role)
  values (stuy_pulse_organization_id, new.id, 'scout')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

-- Repair accounts that were created while the former RLS-filtered lookup was
-- active. Existing memberships and roles are never changed.
insert into public.organization_members (organization_id, user_id, role)
select configuration.default_organization_id, profile.id, 'scout'
from public.profiles profile
cross join private.wildcard_configuration configuration
left join public.organization_members member on member.user_id = profile.id
where configuration.setting_key = 'default_organization'
  and member.user_id is null
on conflict (organization_id, user_id) do nothing;

revoke all on private.wildcard_configuration from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
