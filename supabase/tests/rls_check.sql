-- Row Level Security check: proves both what a user CAN do and what they
-- CANNOT do with somebody else's data. Every assertion raises on failure, so
-- the script stops at the first broken rule.
--
-- Run against a LOCAL database only (it creates and removes test users):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/tests/rls_check.sql
--
-- Everything happens inside one transaction that is rolled back at the end.

-- Only the ok/FAIL notices are worth reading; hide the result rows.
\o /dev/null

begin;

-- Fixtures written as the database owner: two users, a brand, a product and
-- a shared venue. Catalogue rows have to be written this way, which is itself
-- part of what is being checked further down.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test');
insert into public.brands (id, name, temperature_basis)
  values ('00000000-0000-0000-0000-0000000000b1', 'RLS Test Brand', 'snow');
insert into public.products (id, brand_id, name, category, temp_min_c, temp_max_c)
  values ('00000000-0000-0000-0000-0000000000c1',
          '00000000-0000-0000-0000-0000000000b1', 'RLS Test Wax', 'hydrocarbon', -8, -2);
insert into public.venues (id, user_id, name)
  values ('00000000-0000-0000-0000-0000000000d0', null, 'Shared Test Venue');

-- Signs in as a test user, the way PostgREST does with a JWT.
create function pg_temp.sign_in(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

create function pg_temp.expect_error(stmt text, label text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL (was allowed): %', label;
exception
  when others then
    if sqlerrm like 'FAIL (was allowed)%' then raise; end if;
    raise notice 'ok, refused: % (%)', label, sqlerrm;
end;
$$;

create function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', label; end if;
  raise notice 'ok: %', label;
end;
$$;

-- ---------------------------------------------------------------- profiles
select pg_temp.expect(
  (select count(*) from public.profiles
     where id in ('00000000-0000-0000-0000-00000000000a',
                  '00000000-0000-0000-0000-00000000000b')) = 2,
  'a profile is created for every new user');

-- ---------------------------------------------------------------- user A
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a');

select pg_temp.expect((select count(*) from public.products
                       where id = '00000000-0000-0000-0000-0000000000c1') = 1,
  'A can read the catalogue');
select pg_temp.expect_error(
  $$insert into public.brands (name, temperature_basis) values ('Sneaky', 'air')$$,
  'A cannot add a brand to the shared catalogue');
with t as (update public.products set price = 1
           where id = '00000000-0000-0000-0000-0000000000c1' returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'A cannot change a shared product');
with t as (delete from public.brands where id = '00000000-0000-0000-0000-0000000000b1' returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'A cannot delete a shared brand');

-- Adding a wax the catalogue lacks: A's own brand and product.
insert into public.brands (id, created_by, name, temperature_basis)
  values ('00000000-0000-0000-0000-0000000000b2',
          '00000000-0000-0000-0000-00000000000a', 'A Own Brand', 'air');
insert into public.products (id, brand_id, created_by, name, category)
  values ('00000000-0000-0000-0000-0000000000c2',
          '00000000-0000-0000-0000-0000000000b2',
          '00000000-0000-0000-0000-00000000000a', 'A Own Wax', 'klister');
insert into public.products (id, brand_id, created_by, name, category)
  values ('00000000-0000-0000-0000-0000000000c3',
          '00000000-0000-0000-0000-0000000000b1',  -- a shared brand
          '00000000-0000-0000-0000-00000000000a', 'A Wax Under Shared Brand', 'hardwax');
with t as (update public.products set price = 9
           where id = '00000000-0000-0000-0000-0000000000c2' returning 1)
select pg_temp.expect((select count(*) from t) = 1, 'A can edit their own wax');
-- Counted among the test's own rows: the shared catalogue holds real brands too.
select pg_temp.expect(
  (select count(*) from public.brands
     where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2')) = 2,
  'A sees the shared brand and their own');

insert into public.skis (id, user_id, name, technique, category)
  values ('00000000-0000-0000-0000-0000000000e1',
          '00000000-0000-0000-0000-00000000000a', 'A classic', 'classic', 'waxable');
insert into public.venues (id, user_id, name)
  values ('00000000-0000-0000-0000-0000000000d1',
          '00000000-0000-0000-0000-00000000000a', 'A private venue');
insert into public.conditions (id, user_id, venue_id, source, air_temp_c, snow_temp_c, air_rh_pct)
  values ('00000000-0000-0000-0000-0000000000f1',
          '00000000-0000-0000-0000-00000000000a',
          '00000000-0000-0000-0000-0000000000d1', 'forecast', -5, -7, 85);
insert into public.user_products (id, user_id, product_id)
  values ('00000000-0000-0000-0000-0000000000a1',
          '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1');
insert into public.wax_sessions (id, user_id, technique, ski_id, venue_id,
                                 forecast_conditions_id, glide_rating, grip_rating, kick_feel)
  values ('00000000-0000-0000-0000-000000000051',
          '00000000-0000-0000-0000-00000000000a', 'classic',
          '00000000-0000-0000-0000-0000000000e1',
          '00000000-0000-0000-0000-0000000000d0',  -- the shared venue
          '00000000-0000-0000-0000-0000000000f1', 4, 3, 'good');
insert into public.wax_session_layers (user_id, session_id, zone, position, product_id,
                                       user_product_id, method, iron_temp_c)
  values ('00000000-0000-0000-0000-00000000000a',
          '00000000-0000-0000-0000-000000000051', 'glide', 1,
          '00000000-0000-0000-0000-0000000000c1',
          '00000000-0000-0000-0000-0000000000a1', 'iron', 130);
insert into storage.objects (bucket_id, name)
  values ('session-photos', '00000000-0000-0000-0000-00000000000a/s1/photo.jpg');

select pg_temp.expect((select air_humidity_band from public.conditions
                       where id = '00000000-0000-0000-0000-0000000000f1') = 'wet',
  'RH 85 % is filed as humid');
select pg_temp.expect((select count(*) from public.wax_session_layers) = 1,
  'A can read their own session layers');
select pg_temp.expect_error(
  $$insert into public.user_products (user_id, product_id)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1')$$,
  'the same wax cannot be in a box twice');
insert into public.user_tools (user_id, tool_id)
  select '00000000-0000-0000-0000-00000000000a', id from public.tools order by name limit 1;
select pg_temp.expect_error(
  $$insert into public.user_tools (user_id, tool_id)
    select '00000000-0000-0000-0000-00000000000a', id from public.tools order by name limit 1$$,
  'the same tool cannot be ticked twice');
insert into public.user_snow_ranges (user_id, product_id, temp_min_c, temp_max_c)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', -6, 0);
select pg_temp.expect((select count(*) from public.user_snow_ranges) = 1,
  'A can keep their own snow range for a shared wax');
with t as (select temp_max_c from public.products where id = '00000000-0000-0000-0000-0000000000c1')
select pg_temp.expect((select temp_max_c from t) = -2 and
  (select count(*) from public.user_snow_ranges where product_id = '00000000-0000-0000-0000-0000000000c1') = 1,
  'the shared wax itself is unchanged by A''s snow range');
select pg_temp.expect_error(
  $$insert into public.user_snow_ranges (user_id, product_id, temp_min_c, temp_max_c)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', -2, -8)$$,
  'a snow range cannot run backwards');
select pg_temp.expect_error(
  $$insert into public.conditions (user_id, source, snow_temp_c)
    values ('00000000-0000-0000-0000-00000000000a', 'observed', 1)$$,
  'snow warmer than 0 °C is refused');
select pg_temp.expect_error(
  $$insert into public.wax_sessions (user_id, technique, grip_rating)
    values ('00000000-0000-0000-0000-00000000000a', 'skate', 4)$$,
  'a skate session cannot carry a grip rating');
select pg_temp.expect_error(
  $$insert into storage.objects (bucket_id, name)
    values ('session-photos', '00000000-0000-0000-0000-00000000000b/s1/photo.jpg')$$,
  'A cannot upload into B''s photo folder');
with t as (update public.venues set name = 'Mine now'
           where id = '00000000-0000-0000-0000-0000000000d0' returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'A cannot edit a shared venue');

-- ---------------------------------------------------------------- user B
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000b');

select pg_temp.expect((select count(*) from public.skis) = 0, 'B cannot see A''s skis');
select pg_temp.expect((select count(*) from public.wax_sessions) = 0, 'B cannot see A''s sessions');
select pg_temp.expect((select count(*) from public.wax_session_layers) = 0, 'B cannot see A''s layers');
select pg_temp.expect((select count(*) from public.conditions) = 0, 'B cannot see A''s conditions');
select pg_temp.expect((select count(*) from public.user_products) = 0, 'B cannot see A''s wax box');
select pg_temp.expect((select count(*) from public.user_tools) = 0, 'B cannot see A''s tools');
select pg_temp.expect((select count(*) from public.user_snow_ranges) = 0, 'B cannot see A''s snow ranges');
with t as (update public.user_snow_ranges set temp_min_c = -20 returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'B cannot change A''s snow range');
select pg_temp.expect_error(
  $$insert into public.user_snow_ranges (user_id, product_id, temp_min_c)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', -5)$$,
  'B cannot add a snow range in A''s name');
select pg_temp.expect_error(
  $$insert into public.user_snow_ranges (user_id, product_id, temp_min_c)
    values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000c2', -5)$$,
  'B cannot add a snow range for a wax only A can see');
select pg_temp.expect((select count(*) from public.profiles) = 1, 'B sees only their own profile');
-- Only shared rows (created_by null) may be visible to B so far: B has typed
-- nothing in yet, and none of A's may show. The test's shared rows must be there.
select pg_temp.expect(
  not exists (select 1 from public.brands where created_by is not null)
  and exists (select 1 from public.brands where id = '00000000-0000-0000-0000-0000000000b1'),
  'B sees the shared brand but not the one A typed in');
select pg_temp.expect(
  not exists (select 1 from public.products where created_by is not null)
  and exists (select 1 from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  'B sees the shared wax but not the ones A typed in');
select pg_temp.expect((select count(*) from storage.objects) = 0, 'B cannot see A''s photos');
-- Shared venues (Calgary, Bow Valley, Kananaskis) are seeded too, so check the
-- test's own rows rather than the whole list.
select pg_temp.expect(
  not exists (select 1 from public.venues where user_id is not null)
  and exists (select 1 from public.venues where id = '00000000-0000-0000-0000-0000000000d0'),
  'B sees the shared venue but not A''s private one');

-- Writing into A's rows: RLS makes them invisible, so updates touch nothing.
with t as (update public.skis set name = 'stolen' returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'B cannot rename A''s ski');
with t as (delete from public.wax_sessions returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'B cannot delete A''s session');
with t as (update public.profiles set display_name = 'x'
           where id = '00000000-0000-0000-0000-00000000000a' returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'B cannot edit A''s profile');

select pg_temp.expect_error(
  $$insert into public.brands (created_by, name, temperature_basis)
    values ('00000000-0000-0000-0000-00000000000a', 'Planted', 'snow')$$,
  'B cannot add a brand in A''s name');
select pg_temp.expect_error(
  $$insert into public.products (brand_id, created_by, name, category)
    values ('00000000-0000-0000-0000-0000000000b2',
            '00000000-0000-0000-0000-00000000000b', 'Sneaky', 'hardwax')$$,
  'B cannot add a wax under A''s own brand');
with t as (update public.products set price = 0
           where id = '00000000-0000-0000-0000-0000000000c2' returning 1)
select pg_temp.expect((select count(*) from t) = 0, 'B cannot edit A''s wax');
select pg_temp.expect_error(
  $$insert into public.skis (user_id, name, technique)
    values ('00000000-0000-0000-0000-00000000000a', 'planted', 'skate')$$,
  'B cannot create a ski in A''s name');
select pg_temp.expect_error(
  $$insert into public.wax_sessions (user_id, technique, ski_id)
    values ('00000000-0000-0000-0000-00000000000b', 'classic',
            '00000000-0000-0000-0000-0000000000e1')$$,
  'B cannot log a session on A''s ski');
select pg_temp.expect_error(
  $$insert into public.wax_session_layers (user_id, session_id, zone, position)
    values ('00000000-0000-0000-0000-00000000000b',
            '00000000-0000-0000-0000-000000000051', 'grip', 1)$$,
  'B cannot add a layer to A''s session');
select pg_temp.expect_error(
  $$insert into public.conditions (user_id, venue_id, source)
    values ('00000000-0000-0000-0000-00000000000b',
            '00000000-0000-0000-0000-0000000000d1', 'observed')$$,
  'B cannot record conditions at A''s private venue');
select pg_temp.expect_error(
  $$update public.profiles set home_venue_id = '00000000-0000-0000-0000-0000000000d1'
    where id = '00000000-0000-0000-0000-00000000000b'$$,
  'B cannot make A''s private venue their home');

-- And B can do all of this with their own data.
insert into public.skis (user_id, name, technique)
  values ('00000000-0000-0000-0000-00000000000b', 'B skate', 'skate');
-- B may use the same brand name A typed: each person's own brands are separate.
insert into public.brands (created_by, name, temperature_basis)
  values ('00000000-0000-0000-0000-00000000000b', 'A Own Brand', 'snow');
update public.profiles set units = 'f', home_venue_id = '00000000-0000-0000-0000-0000000000d0'
  where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select units from public.profiles) = 'f',
  'B can change their own settings and pick a shared home venue');

-- ---------------------------------------------------------------- anon
reset role;
select set_config('role', 'anon', true);
select pg_temp.expect_error($$select 1 from public.products limit 1$$,
  'a signed-out visitor cannot read the catalogue');

rollback;
