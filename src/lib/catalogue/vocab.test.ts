// The seeder's vocabularies must match the database's, or a load would pass
// `--check` and then fail part-way through. This reads the migration that
// defines them and compares.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FLUORO_STATUSES,
  HUMIDITY_BANDS,
  LAYER_ROLES,
  PRODUCT_CATEGORIES,
  PRODUCT_FORMS,
  SNOW_TYPES,
  TEMPERATURE_BASES,
} from "./vocab";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261115000000_initial_schema.sql"),
  "utf8",
);

/** The quoted words in the first block of SQL that follows `marker`, up to `end`. */
function quotedAfter(marker: string, end: string): string[] {
  const start = sql.indexOf(marker);
  assert.ok(start >= 0, `marker not found: ${marker}`);
  const stop = sql.indexOf(end, start + marker.length);
  const block = sql.slice(start + marker.length, stop);
  return [...block.replace(/--[^\n]*/g, "").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

const sorted = (xs: readonly string[]) => [...xs].sort();

test("product categories match the database", () => {
  assert.deepEqual(sorted(quotedAfter("category text not null check (category in (", "))")), sorted(PRODUCT_CATEGORIES));
});

test("product forms match the database", () => {
  assert.deepEqual(sorted(quotedAfter("form text check (form in (", "))")), sorted(PRODUCT_FORMS));
});

test("snow types match the database", () => {
  assert.deepEqual(sorted(quotedAfter("select value in (", ");")), sorted(SNOW_TYPES));
});

test("layer roles match the database", () => {
  assert.deepEqual(sorted(quotedAfter("select coalesce(bool_and(v in (", "))")), sorted(LAYER_ROLES));
});

test("enums match the database", () => {
  assert.deepEqual(quotedAfter("create type public.humidity_band as enum (", ")"), [...HUMIDITY_BANDS]);
  assert.deepEqual(quotedAfter("create type public.fluoro_status as enum (", ")"), [...FLUORO_STATUSES]);
  assert.deepEqual(quotedAfter("create type public.temperature_basis as enum (", ")"), [...TEMPERATURE_BASES]);
});
