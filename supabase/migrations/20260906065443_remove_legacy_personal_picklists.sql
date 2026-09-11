begin;

-- The shared event board supersedes the original per-user lists. The latter
-- have no remaining application or database dependencies and are removed by
-- explicit product direction.
alter publication supabase_realtime drop table public.picklist_rankings;
drop table public.picklist_rankings;

commit;
