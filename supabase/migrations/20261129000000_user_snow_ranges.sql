-- A skier's own snow range for a wax.
--
-- Every shared-catalogue brand is air-rated, so catalogue waxes carry only
-- their printed (air) range, and the recommendation engine, which compares
-- snow temperatures and never converts air to snow, cannot use them. A skier
-- who knows the snow range a wax works in (from testing, or a brand's snow
-- chart) records it here. Plans then use it for that skier, for waxes in the
-- box and for "Better options to buy" alike.
--
-- It belongs to the skier, not the wax: the shared catalogue row is never
-- changed, and nobody else sees or uses the range. A wax the skier typed in
-- has its own snow range on the product itself (its Edit form); this table
-- is meant for shared waxes, but works for any wax the skier can see.
--
-- Kept per wax rather than per box row, so taking a wax out of the box and
-- putting it back does not lose the range.

create table public.user_snow_ranges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  temp_min_c numeric(4, 1) check (temp_min_c between -50 and 20),
  temp_max_c numeric(4, 1) check (temp_max_c between -50 and 20),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id),
  check (temp_min_c is not null or temp_max_c is not null),
  check (temp_min_c is null or temp_max_c is null or temp_min_c <= temp_max_c)
);

create index user_snow_ranges_user_idx on public.user_snow_ranges (user_id);

create trigger set_updated_at before update on public.user_snow_ranges
  for each row execute function public.set_updated_at();

alter table public.user_snow_ranges enable row level security;

create policy "owner can read" on public.user_snow_ranges
  for select to authenticated using (user_id = (select auth.uid()));
-- The wax must be one the skier can see (shared, or their own). The subquery
-- runs under the products policy, so someone else's private wax is not found.
create policy "owner can insert" on public.user_snow_ranges
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.products p where p.id = product_id));
create policy "owner can update" on public.user_snow_ranges
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.products p where p.id = product_id));
create policy "owner can delete" on public.user_snow_ranges
  for delete to authenticated using (user_id = (select auth.uid()));

-- Signed-in skiers only, as for the other personal tables. The hosted project
-- can grant new tables to anon by default, so that is revoked explicitly.
revoke all on public.user_snow_ranges from anon;
grant select, insert, update, delete on public.user_snow_ranges to authenticated;
grant all on public.user_snow_ranges to service_role;
