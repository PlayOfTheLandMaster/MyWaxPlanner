-- A skier's own iron temperature for a shared catalogue wax the maker gives
-- none for. It lives with their own snow range for that wax (the same rows,
-- the same Row Level Security: theirs alone), and plans use it only where the
-- catalogue has no figure: the maker's own number comes first.

alter table public.user_snow_ranges
  add column iron_temp_c smallint check (iron_temp_c between 80 and 180);
