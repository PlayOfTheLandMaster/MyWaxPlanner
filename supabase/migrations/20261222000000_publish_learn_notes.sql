-- Publishing a waxing note. Notes stay private to their writer (20261220000000)
-- unless an admin publishes one of their own: then every signed-in user can
-- read it. Only its writer can still change or delete it, and only an admin
-- can set published, so nobody else's note can be made public.

alter table public.learn_notes add column published boolean not null default false;

drop policy "owner can read" on public.learn_notes;
create policy "owner or published can read" on public.learn_notes
  for select to authenticated using (user_id = (select auth.uid()) or published);

drop policy "owner can insert" on public.learn_notes;
create policy "owner can insert" on public.learn_notes
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and (not published or exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()))));

drop policy "owner can update" on public.learn_notes;
create policy "owner can update" on public.learn_notes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and (not published or exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()))));

create index learn_notes_published_idx on public.learn_notes (published) where published;
