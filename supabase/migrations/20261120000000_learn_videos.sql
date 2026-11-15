-- The Learn section: a shared library of YouTube videos with notes.
--
-- Everyone signed in can watch; only app admins (Finn) can add, edit or
-- remove videos. Admins are listed in app_admins, which only the service role
-- can change; each user can see whether they themselves are in it.

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
create policy "see own admin row" on public.app_admins
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.app_admins to authenticated;
grant all on public.app_admins to service_role;

-- Finn is the first admin.
insert into public.app_admins (user_id)
select id from auth.users where lower(email) = 'finn@shaw.ca'
on conflict do nothing;

create table public.learn_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (length(trim(title)) > 0),
  channel text,
  topic text not null check (topic in (
    'cleaning', 'glide', 'grip_hardwax', 'grip_klister', 'skins', 'brushing',
    'structure', 'race_prep', 'storage', 'tools'
  )),
  technique text check (technique in ('classic', 'skate')), -- null: both
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  start_seconds integer not null default 0 check (start_seconds >= 0),
  notes text,
  tags text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learn_videos_topic_idx on public.learn_videos (topic);

create trigger set_updated_at before update on public.learn_videos
  for each row execute function public.set_updated_at();

alter table public.learn_videos enable row level security;

create policy "anyone signed in can watch" on public.learn_videos
  for select to authenticated using (true);
create policy "admins add videos" on public.learn_videos
  for insert to authenticated
  with check (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));
create policy "admins edit videos" on public.learn_videos
  for update to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));
create policy "admins remove videos" on public.learn_videos
  for delete to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));

grant select, insert, update, delete on public.learn_videos to authenticated;
grant all on public.learn_videos to service_role;
