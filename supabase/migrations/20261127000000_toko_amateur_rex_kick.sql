-- More Toko glide waxes and the Rex kick waxes, added to the shared catalogue
-- (created_by null). Follows 20261126000000, which created both brands as
-- air-rated and holds the decisions this change repeats.
--
-- Sources, read November 2026:
--   * Toko: the "Amateur" filter of toko.ch's All Ski Waxes list, from a PDF
--     the owner saved (the site refused automated requests). Only the 17
--     waxes not already in the catalogue are added. The PDF kept no links, so
--     these rows have no product link; Toko shows no prices. Four kits are
--     left out: they are bundles, not waxes.
--   * Rex: the kick wax collection of rexwax-usa.com (18 products), with the
--     lowest US price and a shop link.
--
-- Decisions taken with the owner:
--   * Air temperatures, as for these brands' other waxes: printed range only,
--     no snow range, so these waxes are not recommended until one is added.
--     Only one Rex kick wax prints a range; the rest describe temperature in
--     words, which is not turned into numbers.
--   * Fluoro-free only where the text says so; otherwise 'unknown'.
--   * Toko's plant-based Natural waxes are filed as paraffin (the plain hot
--     wax category); the catalogue has no "natural wax" category.
--   * Toko Express Grip & Glide is filed as a glide liquid, so plans never use
--     it as a kick wax.
--   * Layer roles, categories marked paraffin, and snow types are read from
--     each description, so they are inferences. Iron temperatures are empty.
--
-- Safe to run twice: every insert skips rows that already exist.

-- The Toko brand row already exists (20261126000000); these join it.
insert into public.products (
  brand_id, created_by, name, category, form,
  published_temp_min_c, published_temp_max_c, temp_min_c, temp_max_c,
  snow_types, humidity_bands, fluoro_status, layer_roles, iron_temp_c,
  price, currency, buy_url, active
)
select
  b.id, null, v.name, v.category, v.form,
  v.t_min, v.t_max, null, null,
  v.snow_types::text[], v.humidity_bands::public.humidity_band[], v.fluoro::public.fluoro_status,
  v.roles::text[], null,
  v.price, case when v.price is null then null else 'USD' end, v.buy_url, true
from public.brands b
cross join (values
  -- name, category, form, printed min °C, printed max °C, snow types,
  -- humidity, fluoro, layer roles, US price, product page

  -- Toko: liquids for recreational skiers (Amateur list)
  ('All-In-One Wipe & Brush'::text, 'liquid_glider'::text, 'liquid'::text, -30::numeric, 0::numeric, '{}'::text, '{}'::text, 'unknown'::text, '{base,temperature}'::text, null::numeric, null::text),
  ('Performance Liquid Paraffin blue', 'liquid_glider', 'liquid', -30, -10, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Performance Liquid Paraffin red', 'liquid_glider', 'liquid', -12, -4, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Performance Liquid Paraffin yellow', 'liquid_glider', 'liquid', -6, 0, '{wet}', '{}', 'unknown', '{temperature}', null, null),

  -- Toko: Natural waxes, plant-based ('biological'), filed as paraffin by the owner's choice
  ('Natural Speed hot wax yellow', 'hydrocarbon', 'block', -4, 0, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Natural Speed hot wax red', 'hydrocarbon', 'block', -16, 0, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Natural Speed hot wax blue', 'hydrocarbon', 'block', -24, -12, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Natural Wax universal', 'hydrocarbon', 'block', -30, 0, '{}', '{}', 'unknown', '{base,temperature}', null, null),

  -- Toko: Base Performance hot waxes, described as HydroCarbon
  ('Base Performance Hot Wax red', 'hydrocarbon', 'block', -12, -4, '{}', '{}', 'unknown', '{base,temperature}', null, null),
  ('Base Performance Hot Wax blue', 'hydrocarbon', 'block', -30, -10, '{}', '{}', 'unknown', '{base,temperature}', null, null),
  ('Base Performance Hot Wax cleaning', 'base_prep', 'block', null, null, '{}', '{}', 'unknown', '{cleaning,base}', null, null),

  -- Toko: Express waxes, universal (0 to -30 printed)
  ('Express Pocket', 'liquid_glider', 'liquid', -30, 0, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Express Maxi', 'liquid_glider', 'spray', -30, 0, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Express Paste Wax', 'paste_glider', 'paste', -30, 0, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Express Rub-On', 'hydrocarbon', 'block', -30, 0, '{}', '{}', 'unknown', '{temperature}', null, null),

  -- Toko: Express Grip & Glide for cross-country (the second is for fish-scale skis); a glide liquid by the owner's choice, so plans never use it as kick wax
  ('Express Grip & Glide Pocket', 'liquid_glider', 'liquid', -30, 0, '{}', '{}', 'unknown', '{temperature}', null, null),
  ('Express Grip & Glide', 'liquid_glider', 'spray', -30, 0, '{}', '{}', 'unknown', '{temperature}', null, null)
) as v(name, category, form, t_min, t_max, snow_types, humidity_bands, fluoro, roles, price, buy_url)
where b.name = 'Toko' and b.created_by is null
on conflict (brand_id, created_by, name) do nothing;

-- The Rex brand row already exists (20261126000000); these join it.
insert into public.products (
  brand_id, created_by, name, category, form,
  published_temp_min_c, published_temp_max_c, temp_min_c, temp_max_c,
  snow_types, humidity_bands, fluoro_status, layer_roles, iron_temp_c,
  price, currency, buy_url, active
)
select
  b.id, null, v.name, v.category, v.form,
  v.t_min, v.t_max, null, null,
  v.snow_types::text[], v.humidity_bands::public.humidity_band[], v.fluoro::public.fluoro_status,
  v.roles::text[], null,
  v.price, case when v.price is null then null else 'USD' end, v.buy_url, true
from public.brands b
cross join (values
  -- name, category, form, printed min °C, printed max °C, snow types,
  -- humidity, fluoro, layer roles, US price, product page

  -- Rex: Racing Service kick waxes
  ('Green Racing Service Kick Wax'::text, 'hardwax'::text, null::text, null::numeric, null::numeric, '{}'::text, '{}'::text, 'unknown'::text, '{kick}'::text, 24.95::numeric, 'https://rexwax-usa.com/products/green-racing-service-kick-wax-45g'::text),
  ('Blue Racing Service Kick Wax', 'hardwax', null, null, null, '{}', '{}', 'unknown', '{kick}', 24.95, 'https://rexwax-usa.com/products/blue-racing-service-kick-wax-45g'),
  ('Gold Racing Service Kick Wax', 'hardwax', null, null, null, '{}', '{}', 'unknown', '{kick}', 24.95, 'https://rexwax-usa.com/products/gold-racing-service-kick-wax-45g'),

  -- Rex: TK-1814 and 30G family (stated fluor-free)
  ('TK-1814 Kick Wax', 'hardwax', null, null, null, '{man_made,icy}', '{}', 'fluoro_free', '{kick,cover}', 24.95, 'https://rexwax-usa.com/products/tk-1814-kick-wax-45g'),
  ('30GB Kick Wax', 'hardwax', null, null, null, '{fresh_set,transformed}', '{}', 'fluoro_free', '{kick,cover}', 24.95, 'https://rexwax-usa.com/products/30gb-kick-wax-45g'),
  ('30G Kick Wax', 'hardwax', null, null, null, '{fresh_set,falling}', '{}', 'fluoro_free', '{kick,cover}', 24.95, 'https://rexwax-usa.com/products/30g-kick-wax-45g'),

  -- Rex: PowerGrip
  ('PowerGrip Green', 'hardwax', null, null, null, '{}', '{}', 'unknown', '{kick,binder}', 24.95, 'https://rexwax-usa.com/products/powergrip-green-45g'),
  ('PowerGrip Blue', 'hardwax', null, null, null, '{icy,transformed}', '{}', 'unknown', '{kick}', 24.95, 'https://rexwax-usa.com/products/powergrip-blue'),
  ('PowerGrip Purple', 'hardwax', null, null, null, '{icy,transformed,falling}', '{}', 'unknown', '{kick}', 24.95, 'https://rexwax-usa.com/products/powergrip-purple-kick-wax-45g'),

  -- Rex: base wax and classic kick waxes
  ('Orange Base Wax', 'binder', null, null, null, '{}', '{}', 'unknown', '{binder}', 11.95, 'https://rexwax-usa.com/products/orange-base-wax'),
  ('Universal Tar Gold Kick Wax', 'hardwax', null, -8, -1, '{}', '{}', 'unknown', '{kick}', 11.95, 'https://rexwax-usa.com/products/universal-tar-gold-kick-wax-45g'),
  ('Red Kick Wax', 'hardwax', null, null, null, '{fresh_set,falling}', '{}', 'unknown', '{kick,cover}', 11.95, 'https://rexwax-usa.com/products/red-kick-wax-45g'),
  ('Purple Kick Wax', 'hardwax', null, null, null, '{}', '{}', 'unknown', '{kick}', 11.95, 'https://rexwax-usa.com/products/purple-kick-wax-45g'),
  ('Blue Special Kick Wax', 'hardwax', null, null, null, '{icy,transformed}', '{}', 'unknown', '{kick}', 11.95, 'https://rexwax-usa.com/products/blue-special-kick-wax-45g'),
  ('Blue Kick Wax', 'hardwax', null, null, null, '{}', '{}', 'unknown', '{kick}', 11.95, 'https://rexwax-usa.com/products/blue-kick-wax-45g'),
  ('Green Kick Wax', 'hardwax', null, null, null, '{fresh_set}', '{}', 'unknown', '{kick,cover}', 11.95, 'https://rexwax-usa.com/products/green-kick-wax-45g'),

  -- Rex: liquid kick waxes
  ('Blue Liquid Kick Wax', 'grip_spray', 'liquid', null, null, '{}', '{}', 'unknown', '{kick}', 21.95, 'https://rexwax-usa.com/products/blue-liquid-grip-wax-60ml'),
  ('Purple Liquid Kick Wax', 'grip_spray', 'liquid', null, null, '{}', '{}', 'unknown', '{kick}', 21.95, 'https://rexwax-usa.com/products/purple-liquid-grip-wax-60ml')
) as v(name, category, form, t_min, t_max, snow_types, humidity_bands, fluoro, roles, price, buy_url)
where b.name = 'Rex' and b.created_by is null
on conflict (brand_id, created_by, name) do nothing;
