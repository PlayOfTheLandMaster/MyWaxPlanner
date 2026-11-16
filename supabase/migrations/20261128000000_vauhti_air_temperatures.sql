-- Vauhti's ranges are AIR temperatures, by the owner's decision, like Swix,
-- Toko and Rex. 20261124000000 had treated them as snow temperatures and
-- copied each printed range into the snow range (temp_min_c / temp_max_c).
--
-- The printed range (published_temp_*) stays. The snow range is cleared,
-- because the app never converts air to snow: Vauhti waxes can still be found
-- and added to a box, but are not recommended until someone supplies a snow
-- range.
--
-- Only the shared catalogue is touched (created_by null), and a snow range is
-- cleared only where it is still the copy of the printed range, so a snow
-- range someone has entered on purpose is kept. Safe to run twice.

update public.brands
set temperature_basis = 'air'
where name = 'Vauhti' and created_by is null;

update public.products p
set temp_min_c = null,
    temp_max_c = null
from public.brands b
where p.brand_id = b.id
  and b.name = 'Vauhti'
  and b.created_by is null
  and p.created_by is null
  and p.temp_min_c is not distinct from p.published_temp_min_c
  and p.temp_max_c is not distinct from p.published_temp_max_c;
