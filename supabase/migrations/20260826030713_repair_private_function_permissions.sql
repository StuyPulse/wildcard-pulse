-- RLS policies execute as the calling database role, so their internal
-- helpers need explicit EXECUTE for authenticated users. The private schema
-- is not exposed through the Data API, and only the named functions are allowed.
grant usage on schema private to authenticated, supabase_auth_admin;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;
grant execute on function private.shares_organization(uuid) to authenticated;
grant execute on function private.can_access_event(uuid) to authenticated;
grant execute on function private.can_manage_event(uuid) to authenticated;
grant execute on function private.can_read_submission(uuid) to authenticated;

-- Auth uses supabase_auth_admin when inserting auth.users. These trigger
-- functions are not callable by anon or authenticated browser roles.
grant execute on function private.enforce_stuypulse_email() to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;
