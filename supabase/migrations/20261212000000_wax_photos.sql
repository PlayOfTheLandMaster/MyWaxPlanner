-- A photo of each wax's container, so the box can be read at a glance on the
-- bench. One per wax in the box, in the private wax-photos bucket under the
-- owner's own folder: <user_id>/<user_products.id>/<file>. Resized to about
-- 1200 px in the browser before upload, so the list's thumbnails stay light.

alter table public.user_products
  add column photo_path text check (photo_path is null or split_part(photo_path, '/', 1) = user_id::text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wax-photos', 'wax-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

create policy "read own wax photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'wax-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "upload own wax photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wax-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "update own wax photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'wax-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'wax-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own wax photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wax-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
