-- A scout must be able to turn their own saved draft into a submitted record.
-- The original policy allowed only draft-to-draft updates, so a second save
-- either failed the unique assignment constraint or could never submit.
drop policy "scouts update own drafts" on public.match_submissions;

create policy "scouts update and finalize own assigned drafts"
on public.match_submissions for update to authenticated
using (
  scout_user_id = (select auth.uid())
  and status = 'draft'
)
with check (
  scout_user_id = (select auth.uid())
  and status in ('draft', 'submitted')
  and exists (
    select 1 from public.scouting_assignments a
    where a.id = assignment_id
      and a.match_id = match_id
      and a.team_id = team_id
      and a.scout_user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.matches m
    where m.id = match_id and m.event_id = event_id
  )
);

-- Mark an assignment complete only after its owning scout has a submitted
-- record. Admin assignment-management remains covered by its existing policy.
create policy "scouts complete their submitted assignments"
on public.scouting_assignments for update to authenticated
using (
  scout_user_id = (select auth.uid())
  and status in ('pending', 'in_progress')
)
with check (
  scout_user_id = (select auth.uid())
  and status = 'complete'
  and completed_at is not null
  and exists (
    select 1 from public.match_submissions s
    where s.assignment_id = id
      and s.scout_user_id = (select auth.uid())
      and s.status = 'submitted'
  )
);
