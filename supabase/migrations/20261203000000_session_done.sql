-- "Done" on a planned session: skied, not rated yet. The Session tab then
-- lists it under Unrated sessions straight away, even on the same day, and
-- the session page leads with "How did it go?". Written only by the session
-- page's own actions; Row Level Security on wax_sessions already limits it
-- to the session's owner, and save_wax_session() leaves it alone.

alter table public.wax_sessions add column done_at timestamptz;
