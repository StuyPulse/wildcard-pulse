-- Close function execute grants surfaced by the Supabase security advisor.
-- Both functions are invoked by triggers; browser clients never need RPC access.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Cover foreign keys used by deletes, joins, and RLS predicates.
create index event_teams_team_idx on public.event_teams(team_id);
create index organization_members_user_idx on public.organization_members(user_id);
create index assignments_team_idx on public.scouting_assignments(team_id);
create index submissions_scout_idx on public.match_submissions(scout_user_id);
create index submissions_team_idx on public.match_submissions(team_id);
create index submission_photos_submission_idx on public.submission_photos(submission_id);
