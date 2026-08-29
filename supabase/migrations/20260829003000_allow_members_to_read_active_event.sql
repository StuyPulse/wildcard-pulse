-- Every organization member needs the current event in their workspace,
-- before they receive a scouting assignment. Historical events remain limited
-- to strategists, admins, developers, and assigned scouts.
create or replace function private.can_access_event(target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and (
        (e.status = 'active' and private.is_organization_member(e.organization_id))
        or private.has_organization_role(e.organization_id, array['admin','strategist','developer']::public.organization_role[])
        or exists (
          select 1
          from public.scouting_assignments a
          join public.matches m on m.id = a.match_id
          where m.event_id = e.id
            and a.scout_user_id = (select auth.uid())
        )
      )
  );
$$;

revoke all on function private.can_access_event(uuid) from public;
