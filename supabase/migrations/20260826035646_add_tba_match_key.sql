-- TBA playoff match numbers repeat across rounds and sets (for example, sf1m1 and sf2m1).
-- Store TBA's canonical match key so imports remain idempotent for every competition level.
alter table public.matches add column tba_match_key text;

update public.matches
set tba_match_key = 'legacy:' || id::text
where tba_match_key is null;

alter table public.matches alter column tba_match_key set not null;
alter table public.matches drop constraint matches_event_id_match_type_match_number_key;
alter table public.matches add constraint matches_event_id_tba_match_key_key unique (event_id, tba_match_key);
