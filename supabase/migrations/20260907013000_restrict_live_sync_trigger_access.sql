-- Supabase grants newly created public functions to API roles by default.
-- This verifier is only called by the server-side key from the protected route.
revoke execute on function public.verify_live_sync_trigger(text) from anon, authenticated;
grant execute on function public.verify_live_sync_trigger(text) to service_role;
