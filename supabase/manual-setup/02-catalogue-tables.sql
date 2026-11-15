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
