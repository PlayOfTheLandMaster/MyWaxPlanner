-- Database speed-ups: an index under every foreign key Supabase's
-- performance advisor found without one (21). A lookup or a delete on the
-- other side of each key (a venue, a product, a session…) then reads an
-- index instead of the whole table. They matter little at today's size and
-- a lot once a coach has seasons of history; each is small.
--
-- skis_skier_idx and wax_sessions_skier_idx (skier_id alone) are replaced by
-- the (skier_id, user_id) indexes below, which serve every query they did.

drop index if exists public.skis_skier_idx;
drop index if exists public.wax_sessions_skier_idx;

create index if not exists conditions_venue_id_idx on public.conditions (venue_id);
create index if not exists learn_videos_created_by_idx on public.learn_videos (created_by);
create index if not exists products_created_by_idx on public.products (created_by);
create index if not exists profiles_current_skier_id_id_idx on public.profiles (current_skier_id, id);
create index if not exists profiles_home_venue_id_idx on public.profiles (home_venue_id);
create index if not exists recommendations_conditions_id_user_id_idx on public.recommendations (conditions_id, user_id);
create index if not exists recommendations_ski_id_user_id_idx on public.recommendations (ski_id, user_id);
create index if not exists skis_skier_id_user_id_idx on public.skis (skier_id, user_id);
create index if not exists user_products_product_id_idx on public.user_products (product_id);
create index if not exists user_snow_ranges_product_id_idx on public.user_snow_ranges (product_id);
create index if not exists user_tools_tool_id_idx on public.user_tools (tool_id);
create index if not exists wax_session_layers_product_id_idx on public.wax_session_layers (product_id);
create index if not exists wax_session_layers_session_id_user_id_idx on public.wax_session_layers (session_id, user_id);
create index if not exists wax_session_layers_user_product_id_user_id_idx on public.wax_session_layers (user_product_id, user_id);
create index if not exists wax_session_photos_session_id_user_id_idx on public.wax_session_photos (session_id, user_id);
create index if not exists wax_sessions_actual_conditions_id_user_id_idx on public.wax_sessions (actual_conditions_id, user_id);
create index if not exists wax_sessions_forecast_conditions_id_user_id_idx on public.wax_sessions (forecast_conditions_id, user_id);
create index if not exists wax_sessions_recommendation_id_user_id_idx on public.wax_sessions (recommendation_id, user_id);
create index if not exists wax_sessions_ski_id_user_id_idx on public.wax_sessions (ski_id, user_id);
create index if not exists wax_sessions_skier_id_user_id_idx on public.wax_sessions (skier_id, user_id);
create index if not exists wax_sessions_venue_id_idx on public.wax_sessions (venue_id);
