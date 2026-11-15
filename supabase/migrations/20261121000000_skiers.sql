-- Skiers: the people whose skis an account waxes (a coach's athletes, a
-- parent's kids). Names managed by the account holder; no logins. A ski or
-- session with no skier belongs to the account holder ("Me").

create table public.skiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  notes text check (length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create index skiers_user_idx on public.skiers (user_id);

create trigger set_updated_at before update on public.skiers
  for each row execute function public.set_updated_at();

alter table public.skiers enable row level security;
create policy "owner can read" on public.skiers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "owner can insert" on public.skiers
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owner can update" on public.skiers
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner can delete" on public.skiers
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.skiers to authenticated;
grant all on public.skiers to service_role;

-- Whose skis. The foreign key includes user_id, so a pair can only belong to
-- one of the account's own skiers. Deleting a skier keeps their skis (as Me).
alter table public.skis add column skier_id uuid;
alter table public.skis
  add constraint skis_skier_fkey foreign key (skier_id, user_id)
  references public.skiers (id, user_id) on delete set null (skier_id);
create index skis_skier_idx on public.skis (skier_id);

-- Sessions remember the skier too, so history keeps "whose" after a pair is
-- sold or deleted. Filled from the session's skis.
alter table public.wax_sessions add column skier_id uuid;
alter table public.wax_sessions
  add constraint wax_sessions_skier_fkey foreign key (skier_id, user_id)
  references public.skiers (id, user_id) on delete set null (skier_id);
create index wax_sessions_skier_idx on public.wax_sessions (skier_id);

create function public.session_skier_from_ski() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.ski_id is not null and (tg_op = 'INSERT' or new.ski_id is distinct from old.ski_id) then
    new.skier_id := (select k.skier_id from public.skis k where k.id = new.ski_id);
  end if;
  return new;
end;
$$;

create trigger session_skier_from_ski before insert or update on public.wax_sessions
  for each row execute function public.session_skier_from_ski();

-- The History list gains the skier (new columns go at the end of the view).
create or replace view public.wax_session_list
with (security_invoker = true) as
select
  s.id,
  s.user_id,
  s.occurred_at,
  s.status,
  s.technique,
  s.mode,
  s.ski_id,
  k.name as ski_name,
  s.venue_id,
  v.name as venue_name,
  s.event_name,
  s.glide_rating,
  s.grip_rating,
  s.durability_rating,
  s.kick_feel,
  a.air_temp_c,
  a.snow_temp_c,
  a.air_humidity_band,
  a.snow_humidity_band,
  a.snow_type,
  coalesce(lp.product_ids, '{}') as product_ids,
  coalesce(lp.brand_names, '{}') as brand_names,
  coalesce(lp.waxes, '') as waxes,
  coalesce(lp.fluoro_free, true) as fluoro_free,
  lower(concat_ws(' ', s.event_name, s.notes, s.finish_notes, k.name, v.name, lp.waxes, sk.name)) as search_text,
  s.skier_id,
  sk.name as skier_name
from public.wax_sessions s
left join public.skiers sk on sk.id = s.skier_id
left join public.skis k on k.id = s.ski_id
left join public.venues v on v.id = s.venue_id
left join public.conditions a on a.id = s.actual_conditions_id
left join lateral (
  select
    array_agg(distinct l.product_id) filter (where l.product_id is not null) as product_ids,
    array_agg(distinct b.name) filter (where b.name is not null) as brand_names,
    string_agg(coalesce(b.name || ' ' || p.name, l.custom_product), ' · '
               order by l.zone, l.position) as waxes,
    bool_and(p.fluoro_status is null or p.fluoro_status = 'fluoro_free') as fluoro_free
  from public.wax_session_layers l
  left join public.products p on p.id = l.product_id
  left join public.brands b on b.id = p.brand_id
  where l.session_id = s.id
) lp on true;
