-- Initial schema for My Wax Planner (spec: Data model, Inventory, Conditions
-- input, Waxing history).
--
-- Three kinds of table:
--   * Shared catalogue (tools, rules): read-only to signed-in users. Only the
--     service role (a migration, the seed script, an admin) writes them.
--   * Brands and products: a mix. A row with `created_by` null is part of the
--     shared catalogue (loaded with `npm run seed`, optional). A row with
--     `created_by` set was typed in by that user when adding a wax to their
--     box, and only they can see or change it. A wax box is built one wax at
--     a time in the app; the shared catalogue only saves typing.
--   * Personal (everything else): one owner per row, `user_id`, and Row Level
--     Security that compares it with auth.uid() on read and on write.
--
-- Where a personal row points at another personal row (a session's ski, a
-- layer's session) the foreign key includes user_id, so the database itself
-- refuses a row that points at somebody else's data. That holds even for the
-- service role, which RLS does not cover.
--
-- Vocabularies that will grow with the catalogue (product category, form,
-- layer role, snow type, tool type) are text with a CHECK rather than enums:
-- widening a CHECK is one migration, while a new enum value cannot be used in
-- the transaction that adds it.

-- ---------------------------------------------------------------------------
-- Enums: small sets the spec fixes and that are not expected to change.
-- ---------------------------------------------------------------------------

create type public.technique as enum ('classic', 'skate');
create type public.wax_mode as enum ('recreational', 'race');
create type public.temperature_unit as enum ('c', 'f');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced', 'elite');
create type public.ski_category as enum ('waxable', 'skin', 'zero', 'hairies');
create type public.temperature_basis as enum ('air', 'snow');
create type public.fluoro_status as enum ('fluoro_free', 'low', 'high', 'unknown');
create type public.amount_left as enum ('full', 'half', 'low', 'empty');
create type public.humidity_band as enum ('dry', 'mid', 'wet');
create type public.conditions_source as enum ('forecast', 'observed');
create type public.session_status as enum ('planned', 'completed');
create type public.wax_zone as enum ('glide', 'grip');
create type public.kick_feel as enum ('slipping', 'good', 'icing');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Snow types (spec: Conditions input). Used by products, rules and conditions.
create function public.is_snow_type(value text) returns boolean
language sql immutable as $$
  select value in (
    'falling',       -- falling/fresh snow covering the tracks
    'fresh_set',     -- fresh, freshly set
    'fine_grained',  -- fine-grained older snow
    'transformed',   -- transformed / coarse-grained
    'icy',           -- icy / glazed
    'wet',           -- wet / corn
    'dirty',         -- dirty / pollen
    'man_made'
  );
$$;

create function public.are_snow_types(vals text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(public.is_snow_type(v)), true) from unnest(vals) as v;
$$;

-- Layer roles (spec: Glide wizard and Grip wizard outputs).
create function public.are_layer_roles(vals text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(v in (
    'cleaning', 'base', 'temperature', 'top_coat', 'powder',  -- glide
    'binder', 'kick', 'cover',                                -- grip
    'skin_care', 'finish'
  )), true) from unnest(vals) as v;
$$;

-- ---------------------------------------------------------------------------
