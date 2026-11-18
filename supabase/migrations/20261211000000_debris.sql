-- Debris on the track: what had fallen on the snow (needles, leaves, dirt),
-- which slows a ski and wears wax off faster. Recorded beside wind with a
-- session's observed conditions. Null is "not recorded"; 'none' is "looked,
-- and there was none".

alter table public.conditions
  add column debris text check (debris in ('none', 'needles', 'leaves', 'dirt'));

-- save_wax_session() as before (20261117000000_history.sql), now carrying debris.
create or replace function public.save_wax_session(
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
          air_rh_pct, snow_humidity_band, snow_type, new_snow_cm, sky, wind_kmh, debris, track, notes)
        values (
          v_uid, v_venue, coalesce(s.occurred_at, now()), 'observed', c.air_temp_c, c.snow_temp_c,
          c.snow_temp_c is null, c.air_rh_pct, c.snow_humidity_band, c.snow_type, c.new_snow_cm,
          c.sky, c.wind_kmh, c.debris, c.track, c.notes)
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
          debris = c.debris,
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
