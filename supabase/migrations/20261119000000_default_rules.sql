-- Build prompt 5: the recommendation rules, as data.
--
-- A rule says: for this layer, under these conditions, a wax of this category
-- fits, with this weight. A layer goes into a plan when at least one active
-- rule for it matches; the categories of the matching rules (heaviest first)
-- are what the engine looks for in the wax box and the catalogue. Null
-- columns match anything. Tune by editing rows: no redeploy needed.
--
-- Grip rules (binder, kick, cover) only apply to waxable classic skis, and
-- skin_care only to skin skis; the engine checks the ski's grip type.

insert into public.rules
  (technique, mode, layer_role, snow_temp_min_c, snow_temp_max_c, snow_types, snow_humidity_bands, product_category, weight, notes)
values
  -- Glide: clean before a race (hot scrape with a soft base wax)
  (null, 'race', 'cleaning', null, null, '{}', '{}', 'base_prep', 1, 'Hot scrape before race wax'),
  (null, 'race', 'cleaning', null, null, '{}', '{}', 'base_cleaner', 0.5, 'Base cleaner if no soft wax'),
  -- Glide: a hard base layer under race wax, for durability on abrasive snow
  (null, 'race', 'base', null, null, '{transformed,icy,man_made,dirty}', '{}', 'base_prep', 1, 'Durable base on abrasive snow'),
  (null, 'race', 'base', -40, -8, '{}', '{}', 'base_prep', 1, 'Hard cold base under cold race wax'),
  -- Glide: the temperature wax. Recreational favours durable hydrocarbon,
  -- race favours a fluoro-free performance wax.
  (null, 'recreational', 'temperature', null, null, '{}', '{}', 'hydrocarbon', 2, null),
  (null, 'recreational', 'temperature', null, null, '{}', '{}', 'synthetic', 1, null),
  (null, 'recreational', 'temperature', null, null, '{}', '{}', 'paste_glider', 0.6, 'Quick option without an iron'),
  (null, 'race', 'temperature', null, null, '{}', '{}', 'synthetic', 2, null),
  (null, 'race', 'temperature', null, null, '{}', '{}', 'hydrocarbon', 1, null),
  -- Glide: race top coat
  (null, 'race', 'top_coat', null, null, '{}', '{}', 'liquid_glider', 2, null),
  (null, 'race', 'top_coat', null, null, '{}', '{}', 'top_coat', 1.5, null),
  (null, 'race', 'top_coat', null, null, '{}', '{}', 'powder', 1, null),
  -- Grip: binder under klister or on abrasive snow, so the kick wax stays on
  ('classic', null, 'binder', null, null, '{transformed,icy,man_made,wet}', '{}', 'binder', 1, 'Holds klister and hardwax on abrasive snow'),
  ('classic', null, 'binder', -1.5, 0, '{}', '{}', 'binder', 1, null),
  ('classic', 'race', 'binder', -40, 0, '{}', '{}', 'binder', 0.5, 'Race: binder for durability'),
  -- Grip: kick wax. Hardwax on new and fine-grained snow below about −1 °C;
  -- klister on transformed, icy and wet snow, and around zero.
  ('classic', null, 'kick', -40, -1, '{falling,fresh_set,fine_grained,dirty}', '{}', 'hardwax', 2, null),
  ('classic', null, 'kick', -40, -1, '{man_made}', '{}', 'hardwax', 1, 'Fine man-made snow: hardwax, or klister when it ages'),
  ('classic', null, 'kick', null, null, '{transformed,icy,wet}', '{}', 'klister', 3, null),
  ('classic', null, 'kick', -1, 0, '{}', '{}', 'klister', 2, null),
  ('classic', null, 'kick', -1, 0, '{falling,fresh_set}', '{}', 'hardwax', 1, 'New snow at zero: warm hardwax'),
  -- Grip: a hardwax cover over klister when new snow sits on an old base
  ('classic', null, 'cover', -4, 0, '{falling,fresh_set}', '{wet,mid}', 'hardwax', 1, 'Thin hardwax over klister'),
  -- Skin skis
  ('classic', null, 'skin_care', null, null, '{}', '{}', 'skin_care', 2, null),
  ('classic', null, 'skin_care', null, null, '{dirty}', '{}', 'skin_cleaner', 1, 'Clean dirty skins first');
