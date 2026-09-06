-- Persist the field-facing names used in the autonomous starting-position UI.
alter table public.scouting_entries
  drop constraint if exists scouting_entries_match_payload_shape_check;

update public.scouting_entries
set payload = jsonb_set(
  payload,
  '{starting_spot}',
  to_jsonb(
    case payload ->> 'starting_spot'
      when 'position-1' then 'line-1'
      when 'position-2' then 'depot'
      when 'position-3' then 'depot-bump'
      when 'position-4' then 'hub'
      when 'position-5' then 'outpost-bump'
      when 'position-6' then 'outpost'
      when 'position-7' then 'line-2'
      else payload ->> 'starting_spot'
    end
  )
)
where entry_type = 'match' and payload ? 'starting_spot';

alter table public.scouting_entries
  add constraint scouting_entries_match_payload_shape_check
  check (
    entry_type <> 'match'
    or (
      not (payload ? 'shifts')
      and not (payload ? 'climb')
      and (
        not (payload ? 'starting_spot')
        or payload ->> 'starting_spot' is null
        or payload ->> 'starting_spot' in ('line-1', 'depot', 'depot-bump', 'hub', 'outpost-bump', 'outpost', 'line-2')
      )
    )
  );
