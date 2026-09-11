-- The scheduler secret stays in Supabase Vault. Only the server-side key can
-- call this function, and the comparison happens inside Postgres.
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.verify_live_sync_trigger(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(candidate, '') <> ''
    and exists (
      select 1
      from vault.decrypted_secrets as secret
      where secret.name = 'wildcard_live_sync_trigger'
        and secret.decrypted_secret = candidate
    );
$$;

revoke all on function public.verify_live_sync_trigger(text) from public;
grant execute on function public.verify_live_sync_trigger(text) to service_role;
