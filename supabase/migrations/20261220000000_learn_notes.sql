-- Waxing notes: a skier's own articles on the Learn tab (waxing instructions,
-- notes on products, how-tos), each with a title and free text. Private, like
-- the rest of a skier's data: nobody else reads, changes or deletes them.

create table public.learn_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section text not null default 'other' check (section in ('instructions', 'products', 'how_to', 'other')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learn_notes_user_idx on public.learn_notes (user_id, section);

create trigger set_updated_at before update on public.learn_notes
  for each row execute function public.set_updated_at();

alter table public.learn_notes enable row level security;

create policy "owner can read" on public.learn_notes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "owner can insert" on public.learn_notes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owner can update" on public.learn_notes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "owner can delete" on public.learn_notes
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.learn_notes from anon;
grant select, insert, update, delete on public.learn_notes to authenticated;
grant all on public.learn_notes to service_role;
