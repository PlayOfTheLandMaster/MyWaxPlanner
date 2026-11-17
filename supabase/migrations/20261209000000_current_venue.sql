-- Today's location: the venue picked on Today for every wax job that day,
-- with the reader's day it was picked for. Any other day falls back to the
-- home venue.
alter table public.profiles add column current_venue jsonb;
