-- A second temperature range, for old or transformed snow. Swix prints two
-- for its grip waxes (falling snow, say -1 to -7 °C; old or transformed snow,
-- -3 to -10 °C), and some custom glide waxes do too. The first range stays as
-- it was and covers new snow (falling, fresh and settled) and any wax with
-- only one range; recommendations use this one on old snow (fine-grained,
-- transformed, icy, wet, dirty, man-made) when a wax has it.
-- Same shape as the first: as printed on the brand's basis, then normalized
-- to snow temperature, which is what recommendations compare.

alter table public.products
  add column old_published_temp_min_c numeric(4, 1),
  add column old_published_temp_max_c numeric(4, 1),
  add column old_temp_min_c numeric(4, 1),
  add column old_temp_max_c numeric(4, 1),
  add constraint products_old_published_range_order
    check (old_published_temp_min_c is null or old_published_temp_max_c is null
           or old_published_temp_min_c <= old_published_temp_max_c),
  add constraint products_old_snow_range_order
    check (old_temp_min_c is null or old_temp_max_c is null or old_temp_min_c <= old_temp_max_c);
