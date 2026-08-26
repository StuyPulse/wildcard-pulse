alter table public.scouting_entries drop constraint if exists scouting_entries_entry_type_check;
alter table public.scouting_entries add constraint scouting_entries_entry_type_check check (entry_type in ('match', 'pre_scout', 'pit', 'global'));

alter table public.form_definitions drop constraint if exists form_definitions_form_type_check;
alter table public.form_definitions add constraint form_definitions_form_type_check check (form_type in ('match', 'pre_scout', 'pit', 'global'));
