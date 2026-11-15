-- Build prompt 3: the waxing history.
--
-- * save_wax_session(): saves a session, its observed conditions and its
--   layers in one transaction, so a failed layer never leaves half a session.
--   SECURITY INVOKER: it runs as the signed-in user, so Row Level Security
--   checks every row it writes exactly as if the app wrote them one by one.
-- * wax_session_list: one flat row per session for the History screen, so
--   every filter is a plain column test. security_invoker makes the view obey
--   the same Row Level Security as the tables under it.
-- * saved_filters: a named History filter ("Canmore, -5 to -10, race").

-- ---------------------------------------------------------------------------
-- Saved filters
-- ---------------------------------------------------------------------------

create table public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  -- The History screen's query string, e.g. "technique=skate&glide=4".
  query text not null check (length(query) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index saved_filters_user_idx on public.saved_filters (user_id);

alter table public.saved_filters enable row level security;

create policy "owner can read" on public.saved_filters
  for select to authenticated using (user_id = (select auth.uid()));
create policy "owner can insert" on public.saved_filters
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owner can update" on public.saved_filters
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner can delete" on public.saved_filters
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.saved_filters to authenticated;
grant all on public.saved_filters to service_role;

-- ---------------------------------------------------------------------------
-- Saving a session in one go
-- ---------------------------------------------------------------------------
--
-- p_id:      null to create, or the session to replace.
-- p_session: the wax_sessions columns, plus "new_venue_name" to create a venue.
-- p_actual:  the observed conditions after skiing, or null for none.
-- p_layers:  [{zone, layer_role, user_product_id, custom_product, method,
--              iron_temp_c, passes, scrape_brush_steps, notes}], in order.

create function public.save_wax_session(
  p_id uuid,
  p_session jsonb,
  p_actual jsonb,
  p_layers jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := p_id;
  v_venue uuid := nullif(p_session ->> 'venue_id', '')::uuid;
  v_cond uuid;
  s public.wax_sessions;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  if nullif(trim(p_session ->> 'new_venue_name'), '') is not null then
    insert into public.venues (user_id, name)
    values (v_uid, trim(p_session ->> 'new_venue_name'))
    returning id into v_venue;
  end if;

  s := jsonb_populate_record(null::public.wax_sessions, p_session);

  if v_id is not null then
    -- Row Level Security hides other people's sessions, so "not found" covers both.
    select actual_conditions_id into v_cond from public.wax_sessions where id = v_id;
    if not found then
      raise exception 'That session is no longer in your history' using errcode = 'P0002';
    end if;
  end if;

  -- Observed conditions: kept in step with the session, removed when cleared.
  if p_actual is null or p_actual = '{}'::jsonb then
    if v_cond is not null then
      update public.wax_sessions set actual_conditions_id = null where id = v_id;
      delete from public.conditions where id = v_cond;
      v_cond := null;
    end if;
  else
    declare c public.conditions := jsonb_populate_record(null::public.conditions, p_actual);
    begin
      if v_cond is null then
        insert into public.conditions (
          user_id, venue_id, observed_at, source, air_temp_c, snow_temp_c, snow_temp_estimated,
          air_rh_pct, snow_humidity_band, snow_type, new_snow_cm, sky, wind_kmh, track, notes)
        values (
          v_uid, v_venue, coalesce(s.occurred_at, now()), 'observed', c.air_temp_c, c.snow_temp_c,
          c.snow_temp_c is null, c.air_rh_pct, c.snow_humidity_band, c.snow_type, c.new_snow_cm,
          c.sky, c.wind_kmh, c.track, c.notes)
        returning id into v_cond;
      else
        update public.conditions set
          venue_id = v_venue,
          observed_at = coalesce(s.occurred_at, observed_at),
          air_temp_c = c.air_temp_c,
          snow_temp_c = c.snow_temp_c,
          snow_temp_estimated = c.snow_temp_c is null,
          air_rh_pct = c.air_rh_pct,
          snow_humidity_band = c.snow_humidity_band,
          snow_type = c.snow_type,
          new_snow_cm = c.new_snow_cm,
          sky = c.sky,
          wind_kmh = c.wind_kmh,
          track = c.track,
          notes = c.notes
        where id = v_cond;
      end if;
    end;
  end if;

  if v_id is null then
    insert into public.wax_sessions (
      user_id, occurred_at, status, technique, ski_id, mode, event_name, event_distance_km,
      event_result, venue_id, forecast_conditions_id, actual_conditions_id, recommendation_id,
      finish_notes, finish_tags, glide_rating, grip_rating, durability_rating, durability_km,
      durability_hours, kick_feel, notes)
    values (
      v_uid, coalesce(s.occurred_at, now()), coalesce(s.status, 'completed'), s.technique, s.ski_id,
      coalesce(s.mode, 'recreational'), s.event_name, s.event_distance_km, s.event_result, v_venue,
      s.forecast_conditions_id, v_cond, s.recommendation_id, s.finish_notes,
      coalesce(s.finish_tags, '{}'), s.glide_rating, s.grip_rating, s.durability_rating,
      s.durability_km, s.durability_hours, s.kick_feel, s.notes)
    returning id into v_id;
  else
    update public.wax_sessions set
      occurred_at = coalesce(s.occurred_at, occurred_at),
      status = coalesce(s.status, status),
      technique = s.technique,
      ski_id = s.ski_id,
      mode = coalesce(s.mode, mode),
      event_name = s.event_name,
      event_distance_km = s.event_distance_km,
      event_result = s.event_result,
      venue_id = v_venue,
      actual_conditions_id = v_cond,
      finish_notes = s.finish_notes,
      finish_tags = coalesce(s.finish_tags, '{}'),
      glide_rating = s.glide_rating,
      grip_rating = s.grip_rating,
      durability_rating = s.durability_rating,
      durability_km = s.durability_km,
      durability_hours = s.durability_hours,
      kick_feel = s.kick_feel,
      notes = s.notes
    where id = v_id;
    delete from public.wax_session_layers where session_id = v_id;
  end if;

  -- Layers, numbered within their zone in the order given. product_id is
  -- copied from the wax box row, so the history still names the wax after
  -- it has been used up and removed from the box.
  insert into public.wax_session_layers (
    user_id, session_id, zone, position, layer_role, product_id, user_product_id,
    custom_product, method, iron_temp_c, passes, scrape_brush_steps, notes)
  select
    v_uid, v_id, l.zone,
    row_number() over (partition by l.zone order by o.n)::smallint,
    l.layer_role,
    (select up.product_id from public.user_products up where up.id = l.user_product_id),
    l.user_product_id, l.custom_product, l.method, l.iron_temp_c, l.passes,
    l.scrape_brush_steps, l.notes
  from jsonb_array_elements(coalesce(p_layers, '[]'::jsonb)) with ordinality as o (j, n)
  cross join lateral jsonb_populate_record(null::public.wax_session_layers, o.j) as l;

  return v_id;
end;
$$;

revoke execute on function public.save_wax_session(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_wax_session(uuid, jsonb, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- The History list
-- ---------------------------------------------------------------------------

create view public.wax_session_list
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
  lower(concat_ws(' ', s.event_name, s.notes, s.finish_notes, k.name, v.name, lp.waxes)) as search_text
from public.wax_sessions s
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

grant select on public.wax_session_list to authenticated;
