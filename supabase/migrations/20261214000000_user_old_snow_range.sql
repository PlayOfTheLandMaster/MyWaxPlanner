-- A skier's own old-snow range for a shared wax. A wax from the shared
-- catalogue cannot be edited, so its second range (old or transformed snow,
-- see 20261213000000_old_snow_range.sql) is kept with the skier's own snow
-- range, like the first. Optional: the first range is still required.

alter table public.user_snow_ranges
  add column old_temp_min_c numeric(4, 1) check (old_temp_min_c between -50 and 20),
  add column old_temp_max_c numeric(4, 1) check (old_temp_max_c between -50 and 20),
  add constraint user_snow_ranges_old_range_order
    check (old_temp_min_c is null or old_temp_max_c is null or old_temp_min_c <= old_temp_max_c);
