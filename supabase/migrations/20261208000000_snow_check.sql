-- Today's Snow Conditions: the skier's own snow check, made once on Today and
-- used by every wax job that day at that venue. One record per account, kept
-- with the venue and day it is for; the app ignores it on any other.
alter table public.profiles add column snow_check jsonb;
