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
