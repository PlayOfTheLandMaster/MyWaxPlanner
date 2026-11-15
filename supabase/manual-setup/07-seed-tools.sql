-- The tools catalogue, from the spec's Tools checklist. Unlike brands and
-- products this list is brand-neutral and short, so it lives in a migration
-- rather than a CSV. on conflict keeps the migration safe to re-run by hand.

insert into public.tools (type, sub_type, size, name) values
  -- Scrapers
  ('scraper', 'plexi', '3 mm', 'Plexi scraper, 3 mm'),
  ('scraper', 'plexi', '5 mm', 'Plexi scraper, 5 mm'),
  ('groove_scraper', null, null, 'Groove scraper'),
  ('scraper', 'metal', null, 'Metal scraper'),
  -- Hand brushes
  ('brush', 'brass', null, 'Brass brush'),
  ('brush', 'steel', null, 'Steel brush'),
  ('brush', 'combi', null, 'Combi brush'),
  ('brush', 'nylon', 'stiff', 'Nylon brush, stiff'),
  ('brush', 'nylon', 'soft', 'Nylon brush, soft'),
  ('brush', 'horsehair', null, 'Horsehair brush'),
  ('brush', 'boar', null, 'Boar / natural bristle brush'),
  ('brush', 'polishing', null, 'Polishing brush'),
  -- Roto brushes
  ('roto_brush', 'brass_steel', null, 'Roto brush, brass/steel'),
  ('roto_brush', 'nylon', null, 'Roto brush, nylon'),
  ('roto_brush', 'horsehair', null, 'Roto brush, horsehair'),
  ('roto_brush', 'cork', null, 'Roto cork'),
  ('roto_brush', 'polishing', null, 'Roto brush, polishing'),
  ('roto_brush', 'handle', null, 'Roto handle and drill'),
  -- Other
  ('iron', null, null, 'Wax iron'),
  ('iron', 'temperature_control', null, 'Wax iron with digital temperature control'),
  ('profile', null, null, 'Waxing profile / bench'),
  ('vise', null, null, 'Vise'),
  ('structure_tool', null, null, 'Structure / rill tool'),
  ('heat_gun', null, null, 'Heat gun'),
  ('tape', 'grip_zone', null, 'Grip-zone tape'),
  ('cork', 'natural', null, 'Natural cork'),
  ('cork', 'synthetic', null, 'Synthetic cork'),
  ('fibertex', null, null, 'Fibertex pad')
on conflict (type, sub_type, size) do nothing;
