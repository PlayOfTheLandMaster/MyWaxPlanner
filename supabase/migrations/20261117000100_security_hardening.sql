-- Fixes for the Supabase security advisor.
--
-- * The four helper functions get a fixed search_path, so nothing on a
--   caller's search_path can stand in for the objects they use.
-- * handle_new_user() is only ever meant to run as the trigger on auth.users.
--   As a SECURITY DEFINER function in the public schema it was also callable
--   through the API (/rest/v1/rpc/handle_new_user); nobody needs that.

alter function public.set_updated_at() set search_path = '';
alter function public.is_snow_type(text) set search_path = '';
alter function public.are_snow_types(text[]) set search_path = '';
alter function public.are_layer_roles(text[]) set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
