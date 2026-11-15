-- Toko and Rex glide waxes, added to the shared catalogue (created_by null),
-- so anyone can find them under Add a wax.
--
-- Sources, read November 2026:
--   * Toko: the "Professional" filter of toko.ch's All Ski Waxes list (29
--     waxes; Toko makes them for all disciplines, cross-country included).
--     The Beginner and Amateur lists could not be fetched; any waxes only on
--     those lists are not here yet.
--   * Rex: the glide collection of rexwax-usa.com (16 products). The kick wax
--     collection could not be fetched.
-- Only facts are entered: names, printed temperature ranges, prices where the
-- shop shows them, and product links. Nothing here touches the
-- recommendation engine, which never scores brand.
--
-- Decisions taken with the owner:
--   * Both brands' ranges are treated as AIR temperatures (temperature_basis
--     'air'). The printed range is stored and the snow range is left empty,
--     because the app never converts air to snow: these waxes can be found
--     and added to a box, but are not recommended until someone supplies a
--     snow range. Most Rex descriptions give no range at all.
--   * Fluoro status is 'fluoro_free' only where the product text says so
--     ("fluor-free", "PFC free", "non-fluor"). Everything else is 'unknown',
--     including Rex's NF/NFX/SISU/Gold products and Toko's "HydroCarbon"
--     waxes, whose text does not say it outright.
--   * Iron temperature is left empty; the pages give none.
--   * Layer roles, categories marked paraffin, and the snow types and
--     humidity bands are read from each description, so they are inferences.
--   * Rex prices are the US shop's lowest-priced size, in USD. Toko's site
--     shows no prices. Each wax is one row whatever its package size.
--
-- Safe to run twice: every insert skips rows that already exist.

insert into public.brands (name, temperature_basis, website, created_by)
values ('Toko', 'air', 'https://www.toko.ch', null)
on conflict (created_by, name) do nothing;

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

  -- Toko: paste and Jet Top Finish, stated fluor-free
  ('Performance Paste Black'::text, 'paste_glider'::text, 'paste'::text, -30::numeric, 0::numeric, '{dirty,man_made}'::text, '{}'::text, 'fluoro_free'::text, '{temperature}'::text, null::numeric, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/performance-paste-black/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=5e67061dc1a4c538facfdc83037a49eb'::text),
  ('Jet Bloc Top Finish Warm', 'top_coat', 'block', -4, 0, '{wet}', '{}', 'fluoro_free', '{top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-bloc-top-finish-warm/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=c43ecf1928b9e74dd3b90b7386896bf5'),
  ('Jet Bloc Top Finish Mid', 'top_coat', 'block', -12, -2, '{}', '{}', 'fluoro_free', '{top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-bloc-top-finish-mid/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=0cca70fd29a9427dc172a09ece95bc97'),
  ('Jet Bloc Top Finish Cold', 'top_coat', 'block', -20, -10, '{}', '{}', 'fluoro_free', '{top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-bloc-top-finish-cold/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=a7c86c5a522dc31dbb34e32ad88fc592'),
  ('Jet Liquid Top Finish Warm', 'top_coat', 'liquid', -4, 0, '{}', '{wet}', 'fluoro_free', '{top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-liquid-top-finish-warm/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=2663a99a0897b095831ebe403a2fb675'),
  ('Jet Liquid Top Finish Mid', 'top_coat', 'liquid', -12, -2, '{}', '{}', 'fluoro_free', '{top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-liquid-top-finish-mid/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=5591a7470d9837810292b1c505fd6db6'),
  ('Jet Liquid Top Finish Cold', 'top_coat', 'liquid', -20, -10, '{}', '{}', 'fluoro_free', '{top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-liquid-top-finish-cold/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=a8ab08b08a0b56db2d42efe3dfcb65ec'),
  ('Jet Powder Top Finish Warm', 'powder', 'powder', -4, 0, '{}', '{}', 'fluoro_free', '{powder,top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-powder-top-finish-warm/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=b10a9c2befe063c24ac030c0316aad95'),
  ('Jet Powder Top Finish Mid', 'powder', 'powder', -12, -2, '{}', '{}', 'fluoro_free', '{powder,top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-powder-top-finish-mid/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=ce22c14df7aa2c0a2d58b316798247b4'),
  ('Jet Powder Top Finish Cold', 'powder', 'powder', -20, -10, '{}', '{}', 'fluoro_free', '{powder,top_coat}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/jet-powder-top-finish-cold/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=59a13118f757f76eb0692deda7ce0f62'),

  -- Toko: High Performance powders (fluoro not stated)
  ('High Performance Powder blue', 'powder', 'powder', -24, -12, '{}', '{}', 'unknown', '{powder}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-powder-blue/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=3ca8ced2cb82a2700049c3bd400b7389'),
  ('High Performance Powder red', 'powder', 'powder', -16, 0, '{}', '{}', 'unknown', '{powder}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-powder-red/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=c392c73b954fbda84f41c4bf6583c784'),
  ('High Performance Powder yellow', 'powder', 'powder', -4, 0, '{wet}', '{}', 'unknown', '{powder}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-powder-yellow/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=9d6e0efbc77b048da7a53a8c3bde8646'),

  -- Toko: training hot wax (fluoro not stated)
  ('RS Premix 1916 Hot Wax', 'hydrocarbon', 'block', -30, 0, '{}', '{}', 'unknown', '{base,temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/rs-premix-1916-hot-wax/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=de1142bbf7caab7a62776596c9a440cc'),

  -- Toko: High Performance liquid paraffins, stated PFC-free
  ('High Performance Liquid Paraffin red', 'liquid_glider', 'liquid', -12, -4, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-liquid-paraffin-red/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=833af6ecb7e73d0fbda8723d4863571c'),
  ('High Performance Liquid Paraffin yellow', 'liquid_glider', 'liquid', -6, 0, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-liquid-paraffin-yellow/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=14569130b807d7e203e6002cdc12b1b9'),
  ('High Performance Liquid Paraffin blue', 'liquid_glider', 'liquid', -30, -10, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-liquid-paraffin-blue/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=35675df1d349b7589cf8b5e24ad4deed'),

  -- Toko: Base Performance liquid paraffins, junior racing and training (fluoro not stated)
  ('Base Performance Liquid Paraffin yellow', 'liquid_glider', 'liquid', -6, 0, '{}', '{}', 'unknown', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/base-performance-liquid-paraffin-yellow/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=67673ece9260627dc6003b2420e7f16b'),
  ('Base Performance Liquid Paraffin red', 'liquid_glider', 'liquid', -12, -4, '{}', '{}', 'unknown', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/base-performance-liquid-paraffin-red/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=283437451060943988064086a697f630'),
  ('Base Performance Liquid Paraffin blue', 'liquid_glider', 'liquid', -30, -10, '{}', '{}', 'unknown', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/base-performance-liquid-paraffin-blue/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=88e62882abce4d5073ddba7433ad79aa'),

  -- Toko: High Performance hot waxes, stated PFC-free
  ('High Performance Hot Wax warm', 'hydrocarbon', 'block', -4, 0, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-hot-wax-warm/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=6690c265418539f777a65eb28b386253'),
  ('High Performance Hot Wax universal', 'hydrocarbon', 'block', -16, 0, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-hot-wax-universal/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=5006633fb3aac6d29ab908491c057e14'),
  ('High Performance Hot Wax cold', 'hydrocarbon', 'block', -24, -12, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/high-performance-hot-wax-cold/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=ffbd8d0cd644c45c2bb4b2fd530526da'),

  -- Toko: Performance hot waxes, stated PFC-free
  ('Performance Hot Wax yellow', 'hydrocarbon', 'block', -6, 0, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/performance-hot-wax-yellow/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=3d33d7a5ab7e1b8487612fce92cbbe42'),
  ('Performance Hot Wax red', 'hydrocarbon', 'block', -12, -4, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/performance-hot-wax-red/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=e94160f5c30b106b10cd9a23f44755e1'),
  ('Performance Hot Wax blue', 'hydrocarbon', 'block', -30, -10, '{}', '{}', 'fluoro_free', '{temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/performance-hot-wax-blue/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=d8e18db0946154c2b7489304a8137f05'),

  -- Toko: base care, all-round and additive (fluoro not stated)
  ('Base Performance Hot Wax yellow', 'hydrocarbon', 'block', -6, 0, '{}', '{}', 'unknown', '{base,temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/base-performance-hot-wax-yellow/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=0c90936765a1bb5072e349d97a945fdf'),
  ('All-in-one Hot Wax universal', 'hydrocarbon', 'block', -30, 0, '{}', '{}', 'unknown', '{base,temperature}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/all-in-one-hot-wax-universal/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=29b69179cadd13787c42bc67a11a71b6'),
  ('X-Cold Powder', 'powder', 'powder', -30, -15, '{}', '{}', 'unknown', '{powder}', null, 'https://www.toko.ch/en/wax-tools/all-ski-waxes/product/show/x-cold-powder/?tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3&cHash=cb6ae690e5bf33a2a4b5715fb83dcd8f')
) as v(name, category, form, t_min, t_max, snow_types, humidity_bands, fluoro, roles, price, buy_url)
where b.name = 'Toko' and b.created_by is null
on conflict (brand_id, created_by, name) do nothing;

insert into public.brands (name, temperature_basis, website, created_by)
values ('Rex', 'air', 'https://rexwax-usa.com', null)
on conflict (created_by, name) do nothing;

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

  -- Rex: NFX powders
  ('NFX00 SISU White UHW Powder'::text, 'powder'::text, 'powder'::text, null::numeric, null::numeric, '{transformed}'::text, '{}'::text, 'unknown'::text, '{powder,base}'::text, 99.95::numeric, 'https://rexwax-usa.com/products/nfx00-sisu-white-uhw-powder-20g'::text),
  ('NFX41 Pink/Green UHW Powder', 'powder', 'powder', -20, -5, '{transformed,man_made,wet}', '{mid,wet}', 'unknown', '{powder}', 99.95, 'https://rexwax-usa.com/products/nfx41-pink-green-uhw-powder-20g'),
  ('NFX11 Yellow Powder', 'powder', 'powder', -2, 2, '{wet,transformed}', '{mid,wet}', 'unknown', '{powder}', 99.95, 'https://rexwax-usa.com/products/nfx11-yellow-powder-20g'),

  -- Rex: NFX liquids, block and Gold
  ('NFX Black New Snow Liquid', 'liquid_glider', 'liquid', null, null, '{falling,fresh_set}', '{}', 'unknown', '{top_coat,temperature}', 64.95, 'https://rexwax-usa.com/products/nfx-black-new-snow-liquid-60ml'),
  ('NFX Blue Liquid', 'liquid_glider', 'liquid', null, null, '{}', '{}', 'unknown', '{top_coat,temperature}', 64.95, 'https://rexwax-usa.com/products/nfx-blue-liquid-60ml'),
  ('NFX Blue Block', 'top_coat', 'block', null, null, '{transformed,icy}', '{}', 'unknown', '{top_coat}', 99.95, 'https://rexwax-usa.com/products/nfx-blue-block-20g'),
  ('Gold Liquid', 'top_coat', 'spray', null, null, '{}', '{}', 'unknown', '{top_coat}', 69.95, 'https://rexwax-usa.com/products/gold-liquid-30ml'),

  -- Rex: NF and SISU
  ('NF SISU Black Liquid', 'liquid_glider', 'liquid', null, null, '{falling,fresh_set}', '{}', 'unknown', '{base}', 44.95, 'https://rexwax-usa.com/products/nf-sisu-black-liquid'),
  ('NF SISU White Solid', 'hydrocarbon', 'block', null, null, '{}', '{}', 'unknown', '{base}', 44.95, 'https://rexwax-usa.com/products/nf-sisu-white-solid'),
  ('NF41 Pink/Green UHW Liquid', 'liquid_glider', 'liquid', null, null, '{wet,transformed,man_made}', '{}', 'unknown', '{temperature}', 47.95, 'https://rexwax-usa.com/products/nf41-pink-green-uhw-liquid'),
  ('NF21g Black New Snow Solid', 'hydrocarbon', 'block', null, null, '{falling,fresh_set}', '{dry}', 'unknown', '{temperature}', 79.95, 'https://rexwax-usa.com/products/nf21g-black-new-snow-solid'),
  ('NF21 Blue Liquid', 'liquid_glider', 'liquid', null, null, '{}', '{}', 'fluoro_free', '{base,temperature}', 47.95, 'https://rexwax-usa.com/products/nf21-blue-liquid'),

  -- Rex: G21 liquids, cleaner and Original Blue (stated non-fluoro)
  ('G21g Black New Snow Liquid', 'liquid_glider', 'liquid', null, null, '{falling,fresh_set}', '{}', 'fluoro_free', '{temperature}', 29.95, 'https://rexwax-usa.com/products/g21g-black-new-snow-liquid'),
  ('G21 Blue Liquid', 'liquid_glider', 'liquid', null, null, '{}', '{}', 'fluoro_free', '{temperature}', 29.95, 'https://rexwax-usa.com/products/g21-blue-liquid'),
  ('Glide Cleaner SISU', 'base_cleaner', 'liquid', null, null, '{}', '{}', 'fluoro_free', '{cleaning}', 15.95, 'https://rexwax-usa.com/products/glide-cleaner-sisu'),
  ('Original Blue Glider', 'hydrocarbon', 'block', null, null, '{}', '{}', 'fluoro_free', '{base,temperature}', 84.95, 'https://rexwax-usa.com/products/original-blue-glider-600g')
) as v(name, category, form, t_min, t_max, snow_types, humidity_bands, fluoro, roles, price, buy_url)
where b.name = 'Rex' and b.created_by is null
on conflict (brand_id, created_by, name) do nothing;
