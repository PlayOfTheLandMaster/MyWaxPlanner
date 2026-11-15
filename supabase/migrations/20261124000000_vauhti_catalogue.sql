-- Vauhti's cross-country waxes, 2025/2026 season, added to the shared
-- catalogue (created_by null), so anyone can find them under Add a wax.
--
-- Source: Vauhti's "Racing waxes and how to apply those – Cross-Country"
-- (PDF, October 2025). Only facts are entered: names, categories,
-- temperature ranges and the snow each wax is meant for. Page numbers are in
-- the comments. Nothing here touches the recommendation engine, which never
-- scores brand.
--
-- Decisions taken with the owner, because the PDF does not say:
--   * Ranges are treated as SNOW temperatures (temperature_basis 'snow'), so
--     published and normalized ranges are the same numbers.
--   * Glide waxes and toppings: fluoro status left 'unknown'. The PDF lists
--     their ingredients but never calls them fluoro-free. The grip section is
--     titled fluorocarbon-free, so grip waxes, klisters and grip bases are
--     'fluoro_free'.
--   * Iron temperature left empty for every wax. The PDF's advice (roughly
--     150–200 °C, varying by conditions) does not fit one number; it is kept
--     with the layering recipes in docs/research/vauhti-recipes.md.
--   * Layer roles and some snow types are read from each wax's description,
--     so they are inferences. A wax for "all snow types" gets no snow types,
--     which the engine treats as neutral.
--   * GT Pink, GT Green and GT Carrot are only named in recipes, with no data,
--     so they are not added.
--
-- Safe to run twice: both inserts skip rows that already exist.

insert into public.brands (name, temperature_basis, website, created_by)
values ('Vauhti', 'snow', 'https://vauhti.fi', null)
on conflict (created_by, name) do nothing;

insert into public.products (
  brand_id, created_by, name, category, form,
  published_temp_min_c, published_temp_max_c, temp_min_c, temp_max_c,
  snow_types, humidity_bands, fluoro_status, layer_roles, iron_temp_c, active
)
select
  b.id, null, v.name, v.category, v.form,
  v.t_min, v.t_max, v.t_min, v.t_max,
  v.snow_types, v.humidity_bands::public.humidity_band[], v.fluoro::public.fluoro_status,
  v.roles, null, true
from public.brands b
cross join (values
  -- name, category, form, min °C, max °C, snow types, humidity, fluoro, layer roles

  -- Glide cleaner (pp. 2–3; "fluorocarbon free" on the label)
  ('CLEAN & GLIDE', 'base_cleaner', 'liquid', null::numeric, null::numeric,
     '{}'::text[], '{}'::text[], 'fluoro_free', '{cleaning}'::text[]),

  -- UP paraffins and liquids (p. 4; Polar's range is from its label)
  ('UP Universal',        'hydrocarbon',   'block',  -10, 5, '{}', '{}', 'unknown', '{base,temperature}'),
  ('UP Universal Liquid', 'liquid_glider', 'liquid', -10, 5, '{}', '{}', 'unknown', '{base,temperature}'),
  ('UP Polar',            'hydrocarbon',   'block',  -25, -5, '{}', '{}', 'unknown', '{base}'),
  ('UP Polar Liquid',     'liquid_glider', 'liquid', -25, -5, '{}', '{}', 'unknown', '{base}'),

  -- RACE LDR base layers (p. 5; no temperature range given; Black has MoS2)
  ('RACE LDR White',        'hydrocarbon',   'block',  null, null, '{}', '{}', 'unknown', '{base}'),
  ('RACE LDR Black',        'hydrocarbon',   'block',  null, null, '{}', '{}', 'unknown', '{base}'),
  ('RACE LDR White Powder', 'powder',        'powder', null, null, '{}', '{}', 'unknown', '{base}'),
  ('RACE LDR Black Powder', 'powder',        'powder', null, null, '{}', '{}', 'unknown', '{base}'),
  ('RACE LDR White Liquid', 'liquid_glider', 'liquid', null, null, '{}', '{}', 'unknown', '{base}'),

  -- RACE powders (p. 6)
  ('RACE Red Powder',    'powder', 'powder', -3, 7,     '{wet,transformed}',      '{wet}', 'unknown', '{powder}'),
  ('RACE Pink Powder',   'powder', 'powder', -4, 3,     '{}',                     '{}',    'unknown', '{powder}'),
  ('RACE Violet Powder', 'powder', 'powder', -7, -1,    '{dirty,man_made}',       '{}',    'unknown', '{powder}'),
  ('RACE Blue Powder',   'powder', 'powder', -15, -5,   '{man_made,falling}',     '{dry}', 'unknown', '{powder}'),
  ('RACE Green Powder',  'powder', 'powder', -20, -10,  '{falling,fresh_set}',    '{}',    'unknown', '{powder}'),
  ('RACE MoS2 Powder',   'powder', 'powder', null, null, '{transformed,icy}',     '{}',    'unknown', '{powder}'),
  ('RACE C Powder',      'powder', 'powder', null, null, '{fine_grained}',        '{dry}', 'unknown', '{powder}'),

  -- RACE liquids (p. 9; same ranges and snow as the powders)
  ('RACE Red Liquid',    'liquid_glider', 'liquid', -3, 7,    '{wet,transformed}',   '{wet}', 'unknown', '{temperature}'),
  ('RACE Pink Liquid',   'liquid_glider', 'liquid', -4, 3,    '{}',                  '{}',    'unknown', '{temperature}'),
  ('RACE Violet Liquid', 'liquid_glider', 'liquid', -7, -1,   '{dirty,man_made}',    '{}',    'unknown', '{temperature}'),
  ('RACE Blue Liquid',   'liquid_glider', 'liquid', -15, -5,  '{man_made,falling}',  '{dry}', 'unknown', '{temperature}'),
  ('RACE Green Liquid',  'liquid_glider', 'liquid', -20, -10, '{falling,fresh_set}', '{}',    'unknown', '{temperature}'),

  -- TOP RACE toppings (pp. 11–12; ranges from the labels; MoS2 has none)
  ('TOP RACE Red Spray',    'top_coat', 'spray', -3, 7,    '{wet}', '{wet}', 'unknown', '{top_coat}'),
  ('TOP RACE Red Block',    'top_coat', 'block', -3, 7,    '{}',    '{}',    'unknown', '{top_coat}'),
  ('TOP RACE Violet Block', 'top_coat', 'block', -7, -1,   '{}',    '{}',    'unknown', '{top_coat}'),
  ('TOP RACE Blue Block',   'top_coat', 'block', -15, -5,  '{}',    '{}',    'unknown', '{top_coat}'),
  ('TOP RACE MoS2 Block',   'top_coat', 'block', null, null, '{}',  '{}',    'unknown', '{top_coat}'),

  -- Grip bases (p. 20; no ranges; sold in more than one form)
  ('GS Base Super', 'binder', null,    null, null, '{transformed,man_made,icy,wet}', '{}', 'fluoro_free', '{binder}'),
  ('GS Base AT',    'binder', 'block', null, null, '{fresh_set,falling}',            '{}', 'fluoro_free', '{binder}'),
  ('KS Base',       'binder', null,    null, null, '{transformed}',                  '{}', 'fluoro_free', '{binder}'),

  -- PURE RACE grip waxes for old snow (p. 21)
  ('PURE RACE Red',    'hardwax', null, -1, 3,    '{wet,transformed}',      '{wet}', 'fluoro_free', '{kick,cover}'),
  ('PURE RACE Silver', 'hardwax', null, -4, 1,    '{transformed}',          '{}',    'fluoro_free', '{kick}'),
  ('PURE RACE LDR',    'hardwax', null, -10, 0,   '{transformed,man_made}', '{}',    'fluoro_free', '{kick,cover}'),
  ('PURE RACE Blue',   'hardwax', null, -20, -5,  '{transformed,man_made}', '{dry}', 'fluoro_free', '{kick}'),

  -- PURE RACE grip waxes for new snow (p. 22)
  ('PURE RACE White',  'hardwax', null, -3, 3,    '{fine_grained,wet}',     '{wet}', 'fluoro_free', '{kick}'),
  ('PURE RACE Pink',   'hardwax', null, -5, -1,   '{falling,fine_grained}', '{dry}', 'fluoro_free', '{kick,cover}'),
  ('PURE RACE Violet', 'hardwax', null, -7, -2,   '{fine_grained,icy}',     '{}',    'fluoro_free', '{kick}'),
  ('PURE RACE Green',  'hardwax', null, -20, -5,  '{falling,fresh_set}',    '{}',    'fluoro_free', '{kick}'),

  -- PURE RACE klisters (p. 23)
  ('PURE RACE Red Klister',    'klister', 'tube', 1, 10,    '{wet}',                          '{wet}', 'fluoro_free', '{kick,cover}'),
  ('PURE RACE Violet Klister', 'klister', 'tube', -6, 2,    '{transformed,icy}',              '{}',    'fluoro_free', '{kick}'),
  ('PURE RACE LDR Klister',    'klister', 'tube', -10, 5,   '{wet,transformed,icy,falling}',  '{}',    'fluoro_free', '{kick,cover}'),
  ('PURE RACE Blue Klister',   'klister', 'tube', -15, -1,  '{icy,transformed,man_made}',     '{}',    'fluoro_free', '{kick,binder}')
) as v(name, category, form, t_min, t_max, snow_types, humidity_bands, fluoro, roles)
where b.name = 'Vauhti' and b.created_by is null
on conflict (brand_id, created_by, name) do nothing;
