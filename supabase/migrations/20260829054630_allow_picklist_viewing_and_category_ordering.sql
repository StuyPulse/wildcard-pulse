drop policy "picklist collaborators read categories" on public.picklist_categories;
create policy "organization members read picklist categories" on public.picklist_categories for select to authenticated using (private.is_organization_member(organization_id));

drop policy "picklist collaborators read rankings" on public.picklist_rankings;
create policy "organization members read picklist rankings" on public.picklist_rankings for select to authenticated using (private.is_organization_member(organization_id));

drop policy "category owners and admins update categories" on public.picklist_categories;
create policy "picklist collaborators update categories" on public.picklist_categories for update to authenticated using (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[])) with check (private.has_organization_role(organization_id, array['strategist','master','admin','developer']::public.organization_role[]));
