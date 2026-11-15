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
