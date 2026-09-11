drop policy if exists "strategists manage event global documents" on public.event_global_documents;

create policy "strategists manage event global documents"
on public.event_global_documents for all to authenticated
using (
  private.has_organization_role(
    organization_id,
    array['admin','strategist','developer']::public.organization_role[]
  )
)
with check (
  updated_by = (select auth.uid())
  and private.has_organization_role(
    organization_id,
    array['admin','strategist','developer']::public.organization_role[]
  )
  and exists (
    select 1
    from public.events e
    where e.id = event_global_documents.event_id
      and e.organization_id = event_global_documents.organization_id
  )
);
