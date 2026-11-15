-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.tools enable row level security;
alter table public.rules enable row level security;
alter table public.venues enable row level security;
alter table public.profiles enable row level security;
alter table public.skis enable row level security;
alter table public.user_products enable row level security;
alter table public.user_tools enable row level security;
alter table public.conditions enable row level security;
alter table public.recommendations enable row level security;
alter table public.wax_sessions enable row level security;
alter table public.wax_session_layers enable row level security;
alter table public.wax_session_photos enable row level security;

-- Shared catalogue: any signed-in user may read. There are no insert/update/
-- delete policies, so only the service role (which bypasses RLS) can write.
create policy "catalogue is readable" on public.tools
  for select to authenticated using (true);
create policy "catalogue is readable" on public.rules
  for select to authenticated using (true);

-- Brands and products: the shared catalogue plus your own. You can write only
-- your own, so a shared row cannot be edited or claimed, and nobody else's
-- typing ever appears in your list.
create policy "read shared and own brands" on public.brands
  for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));
create policy "add own brands" on public.brands
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "update own brands" on public.brands
  for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "delete own brands" on public.brands
  for delete to authenticated using (created_by = (select auth.uid()));

create policy "read shared and own products" on public.products
  for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));
-- A product's brand must be one you can see: a shared brand or your own. The
-- subquery runs under the brands policy, so someone else's brand is not found.
create policy "add own products" on public.products
  for insert to authenticated
  with check (created_by = (select auth.uid())
              and exists (select 1 from public.brands b where b.id = brand_id));
create policy "update own products" on public.products
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid())
              and exists (select 1 from public.brands b where b.id = brand_id));
create policy "delete own products" on public.products
  for delete to authenticated using (created_by = (select auth.uid()));

-- Venues: your own plus the shared ones (user_id is null). You can only write
-- your own, so a shared venue cannot be edited or claimed.
create policy "read own and shared venues" on public.venues
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "insert own venues" on public.venues
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own venues" on public.venues
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own venues" on public.venues
  for delete to authenticated using (user_id = (select auth.uid()));

-- Profiles: the row is keyed by the user's id. Inserted by the trigger only.
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    -- A home venue must be one you can see (yours or shared). The subquery
    -- runs under the venues policy, so a private venue of someone else's
    -- is simply not found.
    and (home_venue_id is null
         or exists (select 1 from public.venues v where v.id = home_venue_id))
  );

-- Every other personal table: one owner, on read and on write.
do $$
declare t text;
begin
  foreach t in array array[
    'skis', 'user_products', 'user_tools', 'recommendations',
    'wax_session_layers', 'wax_session_photos'
  ] loop
    execute format(
      'create policy "owner can read" on public.%I
         for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "owner can insert" on public.%I
         for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "owner can update" on public.%I
         for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "owner can delete" on public.%I
         for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Conditions and sessions point at venues, which are not owner-keyed (shared
-- venues have no user_id), so the composite foreign key cannot guard them and
-- the policy does: the venue must be visible to the writer.
do $$
declare t text;
begin
  foreach t in array array['conditions', 'wax_sessions'] loop
    execute format(
      'create policy "owner can read" on public.%I
         for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "owner can insert" on public.%I
         for insert to authenticated with check (
           user_id = (select auth.uid())
           and (venue_id is null
                or exists (select 1 from public.venues v where v.id = venue_id)))', t);
    execute format(
      'create policy "owner can update" on public.%I
         for update to authenticated
         using (user_id = (select auth.uid()))
         with check (
           user_id = (select auth.uid())
           and (venue_id is null
                or exists (select 1 from public.venues v where v.id = venue_id)))', t);
    execute format(
      'create policy "owner can delete" on public.%I
         for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
