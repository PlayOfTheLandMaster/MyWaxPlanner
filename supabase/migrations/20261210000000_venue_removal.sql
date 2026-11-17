-- Removing a location from your lists.
--
-- Shared venues belong to every account, so ✕ on one only hides it for you:
-- profiles.hidden_venues. Your own venues are deleted; their sessions are
-- either moved to another venue first or keep the old name as plain text,
-- wax_sessions.venue_label, which the History list shows when the venue is
-- gone (the view's columns are unchanged; only venue_name's source widens).

alter table public.profiles add column hidden_venues uuid[] not null default '{}';
alter table public.wax_sessions add column venue_label text check (char_length(venue_label) <= 200);

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
  coalesce(v.name, s.venue_label) as venue_name,
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
  lower(concat_ws(' ', s.event_name, s.notes, s.finish_notes, k.name, coalesce(v.name, s.venue_label), lp.waxes, sk.name)) as search_text,
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
