create or replace function private.log_shared_picklist_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_state jsonb;
  new_state jsonb;
begin
  if tg_op = 'INSERT' then
    new_state := jsonb_build_object('rank', new.rank, 'category_id', new.category_id, 'note', new.note, 'selected', new.selected);
    insert into public.picklist_change_log (organization_id, event_id, team_id, actor_user_id, action, after_state)
      values (new.organization_id, new.event_id, new.team_id, auth.uid(), 'created', new_state);
    return new;
  end if;

  old_state := jsonb_build_object('rank', old.rank, 'category_id', old.category_id, 'note', old.note, 'selected', old.selected);
  new_state := jsonb_build_object('rank', new.rank, 'category_id', new.category_id, 'note', new.note, 'selected', new.selected);
  if old_state is distinct from new_state then
    insert into public.picklist_change_log (organization_id, event_id, team_id, actor_user_id, action, before_state, after_state)
      values (new.organization_id, new.event_id, new.team_id, auth.uid(), 'updated', old_state, new_state);
  end if;
  return new;
end;
$$;

revoke execute on function private.log_shared_picklist_change() from public, anon, authenticated;
