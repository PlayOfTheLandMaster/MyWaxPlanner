-- Swix cross-country waxes and two cleaning products, added to the shared
-- catalogue (created_by null), so anyone can find them under Add a wax.
--
-- Source: Swix's online wax manual (swixsport.com, US site, read November
-- 2026): the Pro series, liquid glide application, klister application,
-- base and kick wax application, and post-treatment of new skis. Only facts
-- are entered: names, product codes, printed temperature ranges, US prices
-- and product links. Nothing here touches the recommendation engine, which
-- never scores brand.
--
-- Decisions taken with the owner:
--   * Swix's ranges are treated as AIR temperatures (temperature_basis 'air').
--     The printed range is stored; the snow range (temp_min_c / temp_max_c)
--     is left empty, because the app never converts air to snow. These waxes
--     can be found and added to a box, but are not recommended until someone
--     supplies a snow range.
--   * The Pro system (TSP, TS Turbo, PS, HS and the TSL/HSL/PSL liquids) is
--     stated to be fluoro-free. Klisters, kick waxes, DHP White Marathon and
--     the cleaning products are 'unknown': their pages do not say.
--   * TSL, HSL, PSL and DHP White Marathon are described but have no listed
--     products or ranges, so they are added without a range, code or price.
--   * Iron temperature is left empty. The manual's figures depend on the job
--     (for example PS6 at about 140 °C or 160 °C by base structure); they are
--     kept in docs/research/swix-notes.md.
--   * Layer roles and the few snow types and humidity bands are read from
--     the descriptions (and, for KX30 "Blue Ice" and KX75 "Extra Wet", from
--     the names), so they are inferences.
--   * Waxes only named in passing, with no data (VG030, VG035, BP99, BPL),
--     are not added. Each wax is one row whatever its package size.
--   * Prices are the US shop's on the day they were read, in USD.
--
-- A user's own private "Swix" brand, if any, is separate (created_by set) and
-- is not touched.
--
-- Safe to run twice: both inserts skip rows that already exist.

insert into public.brands (name, temperature_basis, website, created_by)
values ('Swix', 'air', 'https://swixsport.com', null)
on conflict (created_by, name) do nothing;

insert into public.products (
  brand_id, created_by, name, sku, category, form,
  published_temp_min_c, published_temp_max_c, temp_min_c, temp_max_c,
  snow_types, humidity_bands, fluoro_status, layer_roles, iron_temp_c,
  price, currency, buy_url, active
)
select
  b.id, null, v.name, v.sku, v.category, v.form,
  v.t_min, v.t_max, null, null,
  v.snow_types::text[], v.humidity_bands::public.humidity_band[], v.fluoro::public.fluoro_status,
  v.roles::text[], null,
  v.price, case when v.price is null then null else 'USD' end, v.buy_url, true
from public.brands b
cross join (values
  -- name, sku, category, form, printed min °C, printed max °C, snow types,
  -- humidity, fluoro, layer roles, US price, product page

  -- Pro system: TSP powders (Pro page; the whole Pro system is stated fluoro-free; TSP resists dirty snow)
  ('TSP5 Turquoise', 'TSP05-4-V'::text, 'powder', 'powder'::text, -15::numeric, -8::numeric, '{dirty}'::text, '{}'::text, 'fluoro_free', '{powder}'::text, 90::numeric, 'https://swixsport.com/us/ski-wax/glide-wax/powder/tsp5-turquoise-8-c-15c-40g--TSP05-4-V'),
  ('TSP6 Blue', 'TSP06-4-V', 'powder', 'powder', -10, -5, '{dirty}', '{}', 'fluoro_free', '{powder}', 90, 'https://swixsport.com/us/ski-wax/glide-wax/powder/tsp6-blue-5c-10c-40g--TSP06-4-V'),
  ('TSP7 Violet', 'TSP07-4-V', 'powder', 'powder', -7, -2, '{dirty}', '{}', 'fluoro_free', '{powder}', 90, 'https://swixsport.com/us/ski-wax/glide-wax/powder/tsp7-violet-2c-7c-40g--TSP07-4-V'),
  ('TSP8 Red', 'TSP08-4-V', 'powder', 'powder', -4, 4, '{dirty}', '{}', 'fluoro_free', '{powder}', 90, 'https://swixsport.com/us/ski-wax/glide-wax/powder/tsp8-red-4c-4c-40g--TSP08-4-V'),
  ('TSP10 Yellow', 'TSP10-4-V', 'powder', 'powder', 0, 10, '{dirty}', '{}', 'fluoro_free', '{powder}', 90, 'https://swixsport.com/us/ski-wax/glide-wax/powder/tsp10-yellow-0c-10c-40g--TSP10-4-V'),

  -- Pro system: TS Turbo blocks for roto wool (Pro page; best in fine and new snow)
  ('TS5 Turbo Turquoise', 'TST05-2-V', 'synthetic', 'block', -15, -8, '{fine_grained,fresh_set,falling}', '{}', 'fluoro_free', '{top_coat,temperature}', 100, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ts5-turbo-turquoise-8-c-15c-20g--TST05-2-V'),
  ('TS6 Turbo Blue', 'TST06-2-V', 'synthetic', 'block', -12, -4, '{fine_grained,fresh_set,falling}', '{}', 'fluoro_free', '{top_coat,temperature}', 100, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ts6-turbo-blue-4c-12c-20g--TST06-2-V'),
  ('TS8 Turbo Red', 'TST08-2-V', 'synthetic', 'block', -4, 4, '{fine_grained,fresh_set,falling}', '{}', 'fluoro_free', '{top_coat,temperature}', 100, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ts8-turbo-red-4c-4c-20g--TST08-2-V'),
  ('TS10 Turbo Yellow', 'TST10-2-V', 'synthetic', 'block', 0, 10, '{fine_grained,fresh_set,falling}', '{}', 'fluoro_free', '{top_coat,temperature}', 100, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ts10-turbo-yellow-0c-10c-20g--TST10-2-V'),

  -- Pro system: PS training and base-prep paraffins (Pro page; also sold in 60 g)
  ('PS6 Blue', 'PS06-18-V', 'hydrocarbon', 'block', -12, -6, '{}', '{}', 'fluoro_free', '{base,temperature}', 48, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ps6-blue-6c-12c-180g--PS06-18-V'),
  ('PS7 Violet', 'PS07-18-V', 'hydrocarbon', 'block', -8, -2, '{}', '{}', 'fluoro_free', '{base,temperature}', 48, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ps7-violet-2c-8c-180g--PS07-18-V'),
  ('PS8 Red', 'PS08-18-V', 'hydrocarbon', 'block', -4, 4, '{}', '{}', 'fluoro_free', '{base,temperature}', 48, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ps8-red-4c-4c-180g--PS08-18-V'),
  ('PS10 Yellow', 'PS10-18-V', 'hydrocarbon', 'block', 0, 10, '{}', '{}', 'fluoro_free', '{base,temperature}', 48, 'https://swixsport.com/us/ski-wax/glide-wax/solid/ps10-yellow-0c-10c-180g--PS10-18-V'),

  -- Pro system: HS gliders (Pro page; better than plain hydrocarbon in humid snow)
  ('HS6 Blue', 'HS06-18-V', 'synthetic', 'block', -12, -6, '{}', '{mid,wet}', 'fluoro_free', '{temperature}', 120, 'https://swixsport.com/us/ski-wax/glide-wax/solid/hs6-blue-6c-12c-180g--HS06-18-V'),
  ('HS7 Violet', 'HS07-18-V', 'synthetic', 'block', -8, -2, '{}', '{mid,wet}', 'fluoro_free', '{temperature}', 120, 'https://swixsport.com/us/ski-wax/glide-wax/solid/hs7-violet-2c-8c-180g--HS07-18-V'),
  ('HS8 Red', 'HS08-18-V', 'synthetic', 'block', -4, 4, '{}', '{mid,wet}', 'fluoro_free', '{temperature}', 120, 'https://swixsport.com/us/ski-wax/glide-wax/solid/hs8-red-4c-4c-180g--HS08-18-V'),
  ('HS10 Yellow', 'HS10-18-V', 'synthetic', 'block', 0, 10, '{}', '{mid,wet}', 'fluoro_free', '{temperature}', 120, 'https://swixsport.com/us/ski-wax/glide-wax/solid/hs10-yellow-0c-10c-180g--HS10-18-V'),

  -- Pro system: liquids (Pro and liquid-application pages; no products or ranges listed)
  ('TSL Top Speed Liquid', null, 'liquid_glider', 'liquid', null, null, '{transformed}', '{mid}', 'fluoro_free', '{top_coat,temperature}', null, null),
  ('HSL High Speed Liquid', null, 'liquid_glider', 'liquid', null, null, '{}', '{}', 'fluoro_free', '{temperature}', null, null),
  ('PSL Performance Speed Liquid', null, 'liquid_glider', 'liquid', null, null, '{}', '{}', 'fluoro_free', '{temperature}', null, null),

  -- Marathon (Pro page, expert advice; hard base for long races, broad range, not part of the Pro system)
  ('DHP White Marathon', null, 'powder', 'powder', null, null, '{}', '{}', 'unknown', '{base,powder}', null, null),

  -- Klisters (klister guide; fluoro not mentioned)
  ('KB20-150C Base Klister Spray', 'KB20-150C-V', 'binder', 'spray', null, null, '{}', '{}', 'unknown', '{binder}', 32, 'https://swixsport.com/us/ski-wax/klister/kb20-150c-base-klister-spray-150ml--KB20-150C-V'),
  ('KX20 Green Base Klister', 'KX20-V', 'binder', 'tube', null, null, '{}', '{}', 'unknown', '{binder}', 24, 'https://swixsport.com/us/ski-wax/klister/kx20-green-base-klister-55g--KX20-V'),
  ('KX30 Blue Ice Klister', 'KX30-V', 'klister', 'tube', -12, 0, '{icy}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/kx30-blue-ice-klister-12c-to-0c-55g--KX30-V'),
  ('KX35 Violet Spec. Klister', 'KX35-V', 'klister', 'tube', -4, 1, '{}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/kx35-violet-spec-klister-1c-4c--KX35-V'),
  ('KX40S Silver Klister', 'KX40S-V', 'klister', 'tube', -4, 2, '{}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/kx40s-silver-klister-4c-to-2c-55g--KX40S-V'),
  ('KX45N Violet Special Klister', 'KX45N-V', 'klister', 'tube', -4, 1, '{}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/kx45n-violet-special-klister-4c-to-1c-55g--KX45N-V'),
  ('KX65 Red Klister', 'KX65-V', 'klister', 'tube', 1, 5, '{}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/kx65-red-klister-1c-to-5c-55g--KX65-V'),
  ('KX75 Red Extra Wet Klister', 'KX75-V', 'klister', 'tube', 2, 15, '{wet}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/kx75-red-extra-wet-klister-2c-to-15c-55g--KX75-V'),
  ('KN33 Nero Klister', 'KN33-V', 'klister', 'tube', -7, 1, '{}', '{}', 'unknown', '{kick}', 44, 'https://swixsport.com/us/ski-wax/klister/kn33-nero-klister-7c-to-1c-55g--KN33-V'),
  ('KN44 Nero Klister', 'KN44-V', 'klister', 'tube', -3, 5, '{}', '{}', 'unknown', '{kick}', 44, 'https://swixsport.com/us/ski-wax/klister/kn44-nero-klister-3c-to-5c-55g--KN44-V'),
  ('K22 Universal VM Klister', 'K22-V', 'klister', 'tube', -3, 10, '{}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/k22-universal-vm-klister-3c-to-10c-55g--K22-V'),
  ('K21S Universal Silver Klister', 'K21S-V', 'klister', 'tube', -5, 3, '{}', '{}', 'unknown', '{kick}', 24, 'https://swixsport.com/us/ski-wax/klister/k21s-universal-silver-klister-5c-to-3c-55g--K21S-V'),

  -- V line kick waxes, recreation and training (kick-wax page; fluoro not mentioned)
  ('V05 Polar Hardwax', 'V0005-V', 'hardwax', null, -25, -12, '{}', '{}', 'unknown', '{kick}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v05-polar-hardwax-25c-to-12c-43g--V0005-V'),
  ('V20 Green Hardwax', 'V0020-V', 'hardwax', null, -15, -8, '{}', '{}', 'unknown', '{kick}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v20-green-hardwax-15c-to-8c-43g--V0020-V'),
  ('V30 Blue Hardwax', 'V0030-V', 'hardwax', null, -10, -2, '{}', '{}', 'unknown', '{kick,binder}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v30-blue-hardwax-10c-to-2c-43g--V0030-V'),
  ('V40 Blue Extra Hardwax', 'V0040-V', 'hardwax', null, -7, -1, '{}', '{}', 'unknown', '{kick,binder}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v40-blue-extra-hardwax-7c-to-1c-43g--V0040-V'),
  ('V45 Violet Special Hardwax', 'V0045-V', 'hardwax', null, -3, 0, '{}', '{}', 'unknown', '{kick}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v45-violet-special-hardwax-3c-to-0c-43g--V0045-V'),
  ('V50 Violet Hardwax', 'V0050-V', 'hardwax', null, 0, 0, '{}', '{}', 'unknown', '{kick}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v50-violet-hardwax-0c-43g--V0050-V'),
  ('V55 Red Special Hardwax', 'V0055-V', 'hardwax', null, 0, 1, '{}', '{}', 'unknown', '{kick}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v55-red-special-hardwax-0c-to-1c-43g--V0055-V'),
  ('V60 Red/Silver Hardwax', 'V0060-V', 'hardwax', null, 0, 3, '{}', '{}', 'unknown', '{kick}', 14, 'https://swixsport.com/us/ski-wax/kick-wax/v60-red-silver-hardwax-0c-to-3c-43g--V0060-V'),

  -- VP line kick waxes, competition (kick-wax page; VP40-VP55 named in the klister guide for covering klister)
  ('VP30 Pro Light Blue', 'VP30-V', 'hardwax', null, -16, -8, '{}', '{}', 'unknown', '{kick}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp30-pro-light-blue-16c-to-8c-43g--VP30-V'),
  ('VP40 Pro Blue', 'VP40-V', 'hardwax', null, -10, -4, '{}', '{}', 'unknown', '{kick,cover}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp40-pro-blue-10c-to-4c-43g--VP40-V'),
  ('VP45 Pro Blue/Violet', 'VP45-V', 'hardwax', null, -5, -1, '{}', '{}', 'unknown', '{kick,cover}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp45-pro-blue-violet-5c-to-1c-43g--VP45-V'),
  ('VP50 Pro Light Violet', 'VP50-V', 'hardwax', null, -3, 0, '{}', '{}', 'unknown', '{kick,cover}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp50-pro-light-violet-3c-to-0c-43g--VP50-V'),
  ('VP55 Pro Violet', 'VP55-V', 'hardwax', null, -2, 1, '{}', '{}', 'unknown', '{kick,cover}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp55-pro-violet-2c-to-1c-43g--VP55-V'),
  ('VP60 Pro Violet/Red', 'VP60-V', 'hardwax', null, -1, 2, '{}', '{}', 'unknown', '{kick}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp60-pro-violet-red-1c-to-2c-43g--VP60-V'),
  ('VP65 Pro Black/Red', 'VP65-V', 'hardwax', null, 0, 2, '{}', '{}', 'unknown', '{kick}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp65-pro-black-red-0c-to-2c-43g--VP65-V'),
  ('VP70 Pro Yellow', 'VP70-V', 'hardwax', null, 0, 3, '{}', '{}', 'unknown', '{kick}', 27, 'https://swixsport.com/us/ski-wax/kick-wax/vp70-pro-yellow-0c-to-3c-43g--VP70-V'),

  -- Cleaning (new-skis page)
  ('Glide Wax Cleaner', 'I84N-V', 'base_cleaner', 'liquid', null, null, '{}', '{}', 'unknown', '{cleaning}', 50, 'https://swixsport.com/us/ski-wax/cleaners/glide-wax-cleaner-500ml--I84N-V'),
  ('T150B Fiberlene Cleaning XL', 'T0150B-V', 'fiberlene', 'roll', null, null, '{}', '{}', 'unknown', '{cleaning}', 78, 'https://swixsport.com/us/ski-wax/cleaners/t150b-fiberlene-cleaning-xl-200m--T0150B-V')
) as v(name, sku, category, form, t_min, t_max, snow_types, humidity_bands, fluoro, roles, price, buy_url)
where b.name = 'Swix' and b.created_by is null
on conflict (brand_id, created_by, name) do nothing;
