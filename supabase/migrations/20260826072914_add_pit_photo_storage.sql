insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pit-photos', 'pit-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "members read pit photos" on storage.objects for select to authenticated
using (bucket_id = 'pit-photos' and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid())));
create policy "members upload pit photos" on storage.objects for insert to authenticated
with check (bucket_id = 'pit-photos' and name like (select auth.uid())::text || '/%' and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid())));
create policy "members replace own pit photos" on storage.objects for update to authenticated
using (bucket_id = 'pit-photos' and name like (select auth.uid())::text || '/%')
with check (bucket_id = 'pit-photos' and name like (select auth.uid())::text || '/%');
