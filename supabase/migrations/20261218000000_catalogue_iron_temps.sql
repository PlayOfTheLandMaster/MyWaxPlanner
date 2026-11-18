-- Iron temperatures for the shared catalogue, from the makers' own published
-- figures only (checked 2026-11-18). Where a maker prints a range, the lower
-- end is stored: start there, as the maker allows. Waxes a maker gives no
-- figure for stay null, and each skier can fill that gap for themselves
-- (user_snow_ranges.iron_temp_c, 20261217000000).
--
-- Swix: each product page on swixsport.com, "Recommended iron temp.: …".
--   TSP6 and TSP7 print 180-200 °C; KX20 prints 110-115 °C; DHP White prints
--   155 °C as a minimum. TS Turbo waxes are for roto wool, no iron: null.
-- Vauhti: "Vauhti racing waxes and how to apply those - Cross-Country v2026"
--   (vauhti.fi), p.7 "Melt the wax with waxing iron with 150 - 200 °C" and
--   p.11 "Iron the powder with waxing iron by using 150 - 200 °C". TOP RACE
--   blocks and sprays and the GS/KS bases are not ironed there: null.
-- Toko: Waxmanual_Hot_Wax.pdf (toko.ch), "WAXIRON TEMPERATURE": Yellow / warm
--   130 °C, Red / universal 140 °C, Blue / cold 150 °C, "for Base Performance
--   and Performance Wax"; applied to those and the High Performance hot waxes
--   (warm / universal / cold), which link that manual. No product page prints
--   a figure, so nothing else of Toko's is filled.
-- Rex: no figure for any catalogue wax on rexwax-usa.com or in the 2008 Rex
--   Racing Guide (which covers older fluoro waxes only): none filled.

update public.products p set iron_temp_c = v.iron
from (values
  ('Swix', 'PS6 Blue', 145), ('Swix', 'PS7 Violet', 140), ('Swix', 'PS8 Red', 130), ('Swix', 'PS10 Yellow', 120),
  ('Swix', 'HS6 Blue', 155), ('Swix', 'HS7 Violet', 150), ('Swix', 'HS8 Red', 150), ('Swix', 'HS10 Yellow', 150),
  ('Swix', 'TSP5 Turquoise', 160), ('Swix', 'TSP6 Blue', 180), ('Swix', 'TSP7 Violet', 180),
  ('Swix', 'TSP8 Red', 160), ('Swix', 'TSP10 Yellow', 160), ('Swix', 'DHP White Marathon', 155),
  ('Swix', 'KX20 Green Base Klister', 110),
  ('Vauhti', 'RACE LDR Black', 150), ('Vauhti', 'RACE LDR White', 150), ('Vauhti', 'UP Polar', 150), ('Vauhti', 'UP Universal', 150),
  ('Vauhti', 'RACE Blue Powder', 150), ('Vauhti', 'RACE C Powder', 150), ('Vauhti', 'RACE Green Powder', 150),
  ('Vauhti', 'RACE LDR Black Powder', 150), ('Vauhti', 'RACE LDR White Powder', 150), ('Vauhti', 'RACE MoS2 Powder', 150),
  ('Vauhti', 'RACE Pink Powder', 150), ('Vauhti', 'RACE Red Powder', 150), ('Vauhti', 'RACE Violet Powder', 150),
  ('Toko', 'Base Performance Hot Wax yellow', 130), ('Toko', 'Base Performance Hot Wax red', 140), ('Toko', 'Base Performance Hot Wax blue', 150),
  ('Toko', 'Performance Hot Wax yellow', 130), ('Toko', 'Performance Hot Wax red', 140), ('Toko', 'Performance Hot Wax blue', 150),
  ('Toko', 'High Performance Hot Wax warm', 130), ('Toko', 'High Performance Hot Wax universal', 140), ('Toko', 'High Performance Hot Wax cold', 150)
) as v (brand, name, iron)
join public.brands b on b.name = v.brand
where p.brand_id = b.id and p.name = v.name and p.iron_temp_c is null;
