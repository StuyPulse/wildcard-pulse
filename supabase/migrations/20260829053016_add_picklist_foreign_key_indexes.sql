create index picklist_categories_created_by_idx on public.picklist_categories(created_by);
create index picklist_rankings_organization_idx on public.picklist_rankings(organization_id);
create index picklist_rankings_team_idx on public.picklist_rankings(team_id);
create index picklist_rankings_user_idx on public.picklist_rankings(user_id);
create index picklist_rankings_category_idx on public.picklist_rankings(category_id);
