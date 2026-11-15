// Loads the SHARED brand and product catalogue from CSV into Supabase.
// Optional: a wax box is built one wax at a time in the app, and this only
// saves typing by pre-filling waxes everyone can pick from. It reads and
// writes shared rows only (created_by null) and never touches a user's own.
//
//   npm run seed -- --check        validate the CSVs only; touches nothing
//   npm run seed                   validate, then add or update every row
//   npm run seed -- --brands other/brands.csv --products other/products.csv
//
// Safe to run again: brands are matched by name and products by brand + name,
// so a second run updates rows in place instead of duplicating them. Nothing
// is deleted — a product dropped from the CSV stays in the catalogue (mark it
// `active` = no instead, so the wax boxes that hold it keep working).
//
// Every row of both files is checked before anything is written, so a mistake
// on line 140 cannot leave the catalogue half-loaded.
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. The
// secret key bypasses Row Level Security, which is the only way to write the
// catalogue; it must never be given a NEXT_PUBLIC_ name.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  parseBrandsCsv,
  parseProductsCsv,
  type Problem,
  type ProductRow,
} from "../src/lib/catalogue/csv";
import type { TemperatureBasis } from "../src/lib/catalogue/vocab";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const brandsPath = argValue("--brands", "data/brands.csv");
const productsPath = argValue("--products", "data/products.csv");

function report(file: string, kind: "error" | "warning", problems: Problem[]) {
  for (const p of problems) {
    console.log(`${kind === "error" ? "ERROR" : "warn "}  ${file} line ${p.line}: ${p.message}`);
  }
}

function read(path: string): string {
  if (!existsSync(path)) {
    console.error(`Cannot find ${path}.`);
    process.exit(1);
  }
  return readFileSync(path, "utf8");
}

// ---------------------------------------------------------------- validate

const brands = parseBrandsCsv(read(brandsPath));
report(brandsPath, "error", brands.errors);
report(brandsPath, "warning", brands.warnings);

const basis = new Map<string, TemperatureBasis>();

// With --check there is no database to ask, so a product's brand has to be in
// brands.csv. Without it, brands already in the database count too.
const supabase = checkOnly ? null : connect();
if (supabase) {
  const { data, error } = await supabase
    .from("brands")
    .select("name, temperature_basis")
    .is("created_by", null);
  if (error) fail(`Could not read brands: ${error.message}`);
  for (const b of data ?? []) basis.set(b.name.toLowerCase(), b.temperature_basis);
}
for (const b of brands.rows) basis.set(b.name.toLowerCase(), b.temperature_basis);

const products = parseProductsCsv(read(productsPath), basis);
report(productsPath, "error", products.errors);
report(productsPath, "warning", products.warnings);

const errorCount = brands.errors.length + products.errors.length;
console.log(
  `\n${brands.rows.length} brand(s) and ${products.rows.length} product(s) read; ` +
    `${errorCount} error(s), ${brands.warnings.length + products.warnings.length} warning(s).`,
);

if (errorCount > 0) fail("Nothing was written. Fix the errors above and run it again.");
if (checkOnly) {
  console.log("Check only: nothing was written.");
  process.exit(0);
}

// ---------------------------------------------------------------- write

const db = supabase!;

if (brands.rows.length > 0) {
  const { error } = await db
    .from("brands")
    .upsert(
      brands.rows.map((b) => ({ ...b, created_by: null })),
      { onConflict: "created_by,name" },
    );
  if (error) fail(`Could not save brands: ${error.message}`);
}

const { data: brandIds, error: idError } = await db
  .from("brands")
  .select("id, name")
  .is("created_by", null);
if (idError) fail(`Could not read brands back: ${idError.message}`);
const idByName = new Map((brandIds ?? []).map((b) => [b.name.toLowerCase(), b.id as string]));

const toInsert = products.rows.map(({ brand, ...rest }: ProductRow) => ({
  ...rest,
  brand_id: idByName.get(brand.toLowerCase())!,
  created_by: null,
}));

const CHUNK = 500;
for (let i = 0; i < toInsert.length; i += CHUNK) {
  const { error } = await db
    .from("products")
    .upsert(toInsert.slice(i, i + CHUNK), { onConflict: "brand_id,created_by,name" });
  if (error) {
    fail(
      `Could not save products ${i + 1}–${Math.min(i + CHUNK, toInsert.length)}: ${error.message}` +
        (i > 0 ? `\nThe first ${i} were saved; running it again is safe.` : ""),
    );
  }
}

console.log(`Saved ${brands.rows.length} brand(s) and ${toInsert.length} product(s).`);

// ---------------------------------------------------------------- helpers

function connect() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local " +
        "(or run with --check to validate the CSVs without a database).",
    );
  }
  return createClient(url!, key!, { auth: { persistSession: false } });
}

function fail(message: string): never {
  console.error(`\n${message}`);
  process.exit(1);
}
