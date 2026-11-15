-- Grants. New tables are not exposed to the API roles automatically, so each
-- one is granted explicitly. anon gets nothing: every screen needs a sign-in.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on public.tools, public.rules to authenticated;

grant select, insert, update, delete on public.brands, public.products
  to authenticated;

grant select, insert, update, delete on
  public.venues, public.skis, public.user_products, public.user_tools,
  public.conditions, public.recommendations, public.wax_sessions,
  public.wax_session_layers, public.wax_session_photos
  to authenticated;

-- Profiles are created by the trigger and never deleted by the user directly
-- (deleting the auth user cascades).
grant select, update on public.profiles to authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Storage: session photos. Private bucket; keys are <user_id>/<session>/<file>
-- and the first segment must be the signed-in user.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-photos', 'session-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

create policy "read own session photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'session-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "upload own session photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'session-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "update own session photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'session-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'session-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own session photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'session-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
