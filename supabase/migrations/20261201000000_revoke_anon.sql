-- Logged-out visitors (the anon role) need nothing from these tables: every
-- screen that reads them is behind sign-in. Hosted Supabase granted anon full
-- access when they were created; Row Level Security already kept the rows
-- private, so this closes a door nobody should have had rather than a leak.
-- (user_snow_ranges was handled the same way in its own migration.)

revoke all on public.app_admins from anon;
revoke all on public.learn_videos from anon;
revoke all on public.saved_filters from anon;
revoke all on public.skiers from anon;
revoke all on public.wax_session_list from anon;
