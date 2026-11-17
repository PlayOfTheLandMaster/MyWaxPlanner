-- The month each account's ski season starts in. A season always runs for 12
-- months from it; August (8) keeps the season everyone had before.
alter table public.profiles
  add column season_start_month smallint not null default 8 check (season_start_month between 1 and 12);
