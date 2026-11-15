-- Initial schema for My Wax Planner (spec: Data model, Inventory, Conditions
-- input, Waxing history).
--
-- Three kinds of table:
--   * Shared catalogue (tools, rules): read-only to signed-in users. Only the
--     service role (a migration, the seed script, an admin) writes them.
--   * Brands and products: a mix. A row with `created_by` null is part of the
--     shared catalogue (loaded with `npm run seed`, optional). A row with
--     `created_by` set was typed in by that user when adding a wax to their
--     box, and only they can see or change it. A wax box is built one wax at
--     a time in the app; the shared catalogue only saves typing.
--   * Personal (everything else): one owner per row, `user_id`, and Row Level
--     Security that compares it with auth.uid() on read and on write.
--
-- Where a personal row points at another personal row (a session's ski, a
-- layer's session) the foreign key includes user_id, so the database itself
-- refuses a row that points at somebody else's data. That holds even for the
-- service role, which RLS does not cover.
--
-- Vocabularies that will grow with the catalogue (product category, form,
-- layer role, snow type, tool type) are text with a CHECK rather than enums:
-- widening a CHECK is one migration, while a new enum value cannot be used in
-- the transaction that adds it.

-- ---------------------------------------------------------------------------
-- Enums: small sets the spec fixes and that are not expected to change.
-- ---------------------------------------------------------------------------

create type public.technique as enum ('classic', 'skate');
create type public.wax_mode as enum ('recreational', 'race');
create type public.temperature_unit as enum ('c', 'f');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced', 'elite');
create type public.ski_category as enum ('waxable', 'skin', 'zero', 'hairies');
create type public.temperature_basis as enum ('air', 'snow');
create type public.fluoro_status as enum ('fluoro_free', 'low', 'high', 'unknown');
create type public.amount_left as enum ('full', 'half', 'low', 'empty');
create type public.humidity_band as enum ('dry', 'mid', 'wet');
create type public.conditions_source as enum ('forecast', 'observed');
create type public.session_status as enum ('planned', 'completed');
create type public.wax_zone as enum ('glide', 'grip');
create type public.kick_feel as enum ('slipping', 'good', 'icing');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Snow types (spec: Conditions input). Used by products, rules and conditions.
create function public.is_snow_type(value text) returns boolean
language sql immutable as $$
  select value in (
    'falling',       -- falling/fresh snow covering the tracks
    'fresh_set',     -- fresh, freshly set
    'fine_grained',  -- fine-grained older snow
    'transformed',   -- transformed / coarse-grained
    'icy',           -- icy / glazed
    'wet',           -- wet / corn
    'dirty',         -- dirty / pollen
    'man_made'
  );
$$;

create function public.are_snow_types(vals text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(public.is_snow_type(v)), true) from unnest(vals) as v;
$$;

-- Layer roles (spec: Glide wizard and Grip wizard outputs).
create function public.are_layer_roles(vals text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(v in (
    'cleaning', 'base', 'temperature', 'top_coat', 'powder',  -- glide
    'binder', 'kick', 'cover',                                -- grip
    'skin_care', 'finish'
  )), true) from unnest(vals) as v;
$$;

-- ---------------------------------------------------------------------------
-- Catalogue: brands
-- ---------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  -- null: shared catalogue. Otherwise the user who typed it in.
  created_by uuid references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- Whether the brand publishes its temperature ranges as air or snow
  -- temperature. Products store both the published range and a range
  -- normalized to snow temperature, so brands can be compared fairly.
  temperature_basis public.temperature_basis not null,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One "Swix" in the shared catalogue and at most one per user. NULLS NOT
  -- DISTINCT makes the shared rows (created_by null) one group too.
  unique nulls not distinct (created_by, name)
);

-- ---------------------------------------------------------------------------
-- Catalogue: products (waxes, liquids, solvents, consumables)
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  -- null: shared catalogue. Otherwise the user who typed it in.
  created_by uuid references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sku text,
  category text not null check (category in (
    -- glide
    'base_prep', 'hydrocarbon', 'synthetic', 'liquid_glider', 'paste_glider',
    'powder', 'top_coat',
    -- grip
    'hardwax', 'klister', 'binder', 'grip_spray', 'skin_care',
    -- solvents and cleaners
    'base_cleaner', 'wax_remover', 'fluoro_remover', 'skin_cleaner', 'citrus_solvent',
    -- consumables
    'fibertex', 'fiberlene', 'cork', 'sandpaper', 'structure_insert'
  )),
  -- Which part of the box a category belongs to; derived so it cannot disagree.
  category_group text generated always as (
    case
      when category in ('base_prep', 'hydrocarbon', 'synthetic', 'liquid_glider',
                        'paste_glider', 'powder', 'top_coat') then 'glide'
      when category in ('hardwax', 'klister', 'binder', 'grip_spray', 'skin_care') then 'grip'
      when category in ('base_cleaner', 'wax_remover', 'fluoro_remover',
                        'skin_cleaner', 'citrus_solvent') then 'solvent'
      else 'consumable'
    end
  ) stored,
  form text check (form in (
    'block', 'liquid', 'spray', 'paste', 'powder', 'tube', 'gel', 'sheet', 'roll', 'insert', 'other'
  )),
  -- As printed by the brand, on the brand's basis (air or snow).
  published_temp_min_c numeric(4, 1),
  published_temp_max_c numeric(4, 1),
  -- Normalized to snow temperature. This is what recommendations compare.
  -- Null until somebody supplies it for an air-rated product.
  temp_min_c numeric(4, 1),
  temp_max_c numeric(4, 1),
  snow_types text[] not null default '{}' check (public.are_snow_types(snow_types)),
  humidity_bands public.humidity_band[] not null default '{}',
  fluoro_status public.fluoro_status not null default 'unknown',
  layer_roles text[] not null default '{}' check (public.are_layer_roles(layer_roles)),
  iron_temp_c smallint check (iron_temp_c between 80 and 180),
  price numeric(8, 2) check (price >= 0),
  currency char(3),
  buy_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (brand_id, created_by, name),
  check (published_temp_min_c is null or published_temp_max_c is null
         or published_temp_min_c <= published_temp_max_c),
  check (temp_min_c is null or temp_max_c is null or temp_min_c <= temp_max_c)
);

create index products_brand_idx on public.products (brand_id);
create index products_category_idx on public.products (category);

-- ---------------------------------------------------------------------------
-- Catalogue: tools
-- ---------------------------------------------------------------------------

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'scraper', 'groove_scraper', 'brush', 'roto_brush', 'iron', 'cork',
    'fibertex', 'structure_tool', 'profile', 'vise', 'heat_gun', 'tape', 'other'
  )),
  -- e.g. brass, steel, nylon, horsehair, boar, combi, plexi, metal
  sub_type text,
  -- e.g. "3 mm", "5 mm", "100 mm", "0.75 mm insert"
  size text,
  name text not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (type, sub_type, size)
);

-- ---------------------------------------------------------------------------
-- Catalogue: recommendation rules (tuned without a redeploy; used in phase 2)
-- ---------------------------------------------------------------------------

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  technique public.technique,              -- null: both techniques
  mode public.wax_mode,                    -- null: both modes
  layer_role text not null check (public.are_layer_roles(array[layer_role])),
  snow_temp_min_c numeric(4, 1),
  snow_temp_max_c numeric(4, 1),
  snow_types text[] not null default '{}' check (public.are_snow_types(snow_types)),
  snow_humidity_bands public.humidity_band[] not null default '{}',
  product_category text not null,
  procedure_template jsonb not null default '[]'::jsonb,
  weight numeric(5, 2) not null default 1,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (snow_temp_min_c is null or snow_temp_max_c is null
         or snow_temp_min_c <= snow_temp_max_c)
);

-- ---------------------------------------------------------------------------
-- Personal: venues
-- ---------------------------------------------------------------------------

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  -- null: a shared venue anybody can pick (written by the service role only).
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  latitude numeric(8, 5) check (latitude between -90 and 90),
  longitude numeric(8, 5) check (longitude between -180 and 180),
  elevation_m integer,
  typical_snow text check (typical_snow in ('natural', 'man_made', 'mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venues_user_idx on public.venues (user_id);

-- ---------------------------------------------------------------------------
-- Personal: profiles (one per auth user, created by trigger)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  units public.temperature_unit not null default 'c',
  default_mode public.wax_mode not null default 'recreational',
  home_venue_id uuid references public.venues (id) on delete set null,
  skill_level public.skill_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Personal: skis
-- ---------------------------------------------------------------------------

create table public.skis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  technique public.technique not null,
  -- How a classic ski grips. Skate skis have none.
  category public.ski_category,
  brand text,
  model text,
  base_material text,
  grind text,
  flex text,
  grip_zone_cm numeric(5, 1) check (grip_zone_cm > 0 and grip_zone_cm < 150),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (technique = 'classic' or category is null)
);

create index skis_user_idx on public.skis (user_id);

-- ---------------------------------------------------------------------------
-- Personal: inventory
-- ---------------------------------------------------------------------------

create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Always a products row: a wax the catalogue lacks is added to products
  -- (as the user's own) rather than described here, so the recommendation
  -- engine has one place to read a wax's ranges from.
  product_id uuid not null references public.products (id) on delete restrict,
  amount_left public.amount_left not null default 'full',
  quantity smallint not null default 1 check (quantity >= 0),
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index user_products_user_idx on public.user_products (user_id);

create table public.user_tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_id uuid not null references public.tools (id) on delete restrict,
  condition text check (condition in ('new', 'good', 'worn', 'replace')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_tools_user_idx on public.user_tools (user_id);

-- ---------------------------------------------------------------------------
-- Personal: conditions (forecast and observed snapshots)
-- ---------------------------------------------------------------------------

create table public.conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete set null,
  observed_at timestamptz not null default now(),
  source public.conditions_source not null,
  air_temp_c numeric(4, 1),
  air_temp_min_c numeric(4, 1),
  air_temp_max_c numeric(4, 1),
  overnight_low_c numeric(4, 1),
  -- Snow cannot be warmer than 0 °C.
  snow_temp_c numeric(4, 1) check (snow_temp_c <= 0),
  -- true when the app estimated it, false when the skier entered or measured it.
  snow_temp_estimated boolean not null default true,
  air_rh_pct smallint check (air_rh_pct between 0 and 100),
  -- Spec: dry (<50), medium (50-80), humid (>80).
  air_humidity_band public.humidity_band generated always as (
    case
      when air_rh_pct is null then null
      when air_rh_pct < 50 then 'dry'::public.humidity_band
      when air_rh_pct <= 80 then 'mid'::public.humidity_band
      else 'wet'::public.humidity_band
    end
  ) stored,
  -- From the snowball test.
  snow_humidity_band public.humidity_band,
  snow_type text check (snow_type is null or public.is_snow_type(snow_type)),
  new_snow_cm numeric(5, 1) check (new_snow_cm >= 0),
  sky text check (sky in ('sun', 'partly_cloudy', 'overcast', 'snowing', 'raining', 'fog')),
  wind_kmh numeric(5, 1) check (wind_kmh >= 0),
  track text check (track in ('freshly_groomed', 'skied_in', 'glazed', 'soft')),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (air_temp_min_c is null or air_temp_max_c is null or air_temp_min_c <= air_temp_max_c)
);

create index conditions_user_idx on public.conditions (user_id);

-- ---------------------------------------------------------------------------
-- Personal: saved recommendations
-- ---------------------------------------------------------------------------

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ski_id uuid,
  conditions_id uuid,
  technique public.technique not null,
  mode public.wax_mode not null,
  -- [{ layer_role, product_id | null, user_product_id | null, reason, fit }]
  layers jsonb not null default '[]'::jsonb,
  -- [{ step, text, tool_ids }]
  procedure_steps jsonb not null default '[]'::jsonb,
  -- [{ layer_role | tool, reason }]
  inventory_gaps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (ski_id, user_id) references public.skis (id, user_id) on delete set null (ski_id),
  foreign key (conditions_id, user_id) references public.conditions (id, user_id) on delete set null (conditions_id)
);

create index recommendations_user_idx on public.recommendations (user_id);

-- ---------------------------------------------------------------------------
-- Personal: waxing history
-- ---------------------------------------------------------------------------

create table public.wax_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  status public.session_status not null default 'completed',
  technique public.technique not null,
  ski_id uuid,
  mode public.wax_mode not null default 'recreational',
  event_name text,
  event_distance_km numeric(6, 1) check (event_distance_km > 0),
  event_result text,
  venue_id uuid references public.venues (id) on delete set null,
  forecast_conditions_id uuid,
  actual_conditions_id uuid,
  recommendation_id uuid,
  finish_notes text,
  finish_tags text[] not null default '{}',
  glide_rating smallint check (glide_rating between 1 and 5),
  grip_rating smallint check (grip_rating between 1 and 5),
  durability_rating smallint check (durability_rating between 1 and 5),
  durability_km numeric(6, 1) check (durability_km >= 0),
  durability_hours numeric(5, 1) check (durability_hours >= 0),
  kick_feel public.kick_feel,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- Grip is a classic-only idea.
  check (technique = 'classic' or (grip_rating is null and kick_feel is null)),
  foreign key (ski_id, user_id) references public.skis (id, user_id) on delete set null (ski_id),
  foreign key (forecast_conditions_id, user_id)
    references public.conditions (id, user_id) on delete set null (forecast_conditions_id),
  foreign key (actual_conditions_id, user_id)
    references public.conditions (id, user_id) on delete set null (actual_conditions_id),
  foreign key (recommendation_id, user_id)
    references public.recommendations (id, user_id) on delete set null (recommendation_id)
);

create index wax_sessions_user_date_idx on public.wax_sessions (user_id, occurred_at desc);

create table public.wax_session_layers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  zone public.wax_zone not null,
  position smallint not null check (position >= 1),
  layer_role text check (layer_role is null or public.are_layer_roles(array[layer_role])),
  product_id uuid references public.products (id) on delete restrict,
  user_product_id uuid,
  custom_product text,
  method text check (method in ('iron', 'rub_on', 'liquid', 'powder', 'cork', 'spray')),
  iron_temp_c smallint check (iron_temp_c between 80 and 180),
  passes smallint check (passes >= 0),
  scrape_brush_steps text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.wax_sessions (id, user_id) on delete cascade,
  foreign key (user_product_id, user_id)
    references public.user_products (id, user_id) on delete set null (user_product_id),
  unique (session_id, zone, position)
);

create index wax_session_layers_session_idx on public.wax_session_layers (session_id);

create table public.wax_session_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  -- Key in the session-photos bucket: <user_id>/<session_id>/<file>
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.wax_sessions (id, user_id) on delete cascade,
  check (split_part(storage_path, '/', 1) = user_id::text)
);

create index wax_session_photos_session_idx on public.wax_session_photos (session_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'brands', 'products', 'rules', 'venues', 'profiles', 'skis',
    'user_products', 'user_tools', 'wax_sessions'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
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
