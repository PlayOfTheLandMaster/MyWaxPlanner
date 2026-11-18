-- A row of user_snow_ranges may now hold only an iron temperature (Your iron
-- temperature, 20261217000000), or only an old-snow range. The first rule
-- (20261129000000) demanded a new-snow end, so saving an iron temperature on
-- its own was refused, and so was Remove on a snow range that kept one.
alter table public.user_snow_ranges drop constraint user_snow_ranges_check;
alter table public.user_snow_ranges add constraint user_snow_ranges_has_something check (
  temp_min_c is not null or temp_max_c is not null
  or old_temp_min_c is not null or old_temp_max_c is not null
  or iron_temp_c is not null
);
