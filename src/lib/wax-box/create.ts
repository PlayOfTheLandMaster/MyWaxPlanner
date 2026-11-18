import "server-only";
// Putting a wax into the signed-in skier's box: checking a typed wax, finding
// or creating its brand and product, then the box row. Shared by Add a wax
// and by adding a wax on the fly from a wax job's layer, so both follow one
// set of rules. Row Level Security enforces them again.

import type { SupabaseClient } from "@supabase/supabase-js";
import { readProduct, type ProductRow } from "@/lib/catalogue/csv";
import { TEMPERATURE_BASES, type TemperatureBasis } from "@/lib/catalogue/vocab";

// Field names that appear in readProduct's messages, in the form's words.
const FIELD_WORDS: [RegExp, string][] = [
  [/published_temp_min_c|published_temp_max_c/g, "temperature"],
  [/snow_temp_min_c|snow_temp_max_c/g, "snow temperature"],
  [/published range/g, "The temperature range"],
  [/snow range/g, "The snow temperature range"],
  [/iron_temp_c/g, "Iron temperature"],
];

export function inFormWords(message: string): string {
  return FIELD_WORDS.reduce((m, [pattern, words]) => m.replace(pattern, words), message);
}

const LIST_FIELDS = ["snow_types", "humidity_bands", "layer_roles"];
const AMOUNTS = ["full", "half", "low", "empty"] as const;
type Amount = (typeof AMOUNTS)[number];

export const isAmount = (v: unknown): v is Amount => (AMOUNTS as readonly unknown[]).includes(v);


/** Form fields → the record shape a CSV row has, so one set of rules checks both. */
export function formRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$")) continue;
    // Checkbox groups arrive as several values; join them as a CSV cell would.
    record[key] = LIST_FIELDS.includes(key) && record[key] ? `${record[key]};${value}` : value;
  }
  record.brand = (record.brand ?? "").trim().replace(/\s+/g, " ");
  record.name = (record.name ?? "").trim().replace(/\s+/g, " ");
  return record;
}

type CheckedWax =
  | { error: string }
  | { error?: undefined; row: ProductRow; brandId: string | null; basis: TemperatureBasis };

/**
 * Checks a typed wax and finds its brand among the ones this user can see
 * (shared catalogue and their own), matched ignoring case so "swix" finds
 * "Swix" rather than starting a second brand. Writes nothing: a new brand is
 * only created once everything else has passed (see `ensureBrand`).
 */
export async function checkWax(supabase: SupabaseClient, record: Record<string, string>): Promise<CheckedWax> {
  if (!record.brand) return { error: "Enter the brand." };
  if (!record.name) return { error: "Enter the wax's name." };

  const { data: brands, error } = await supabase.from("brands").select("id, name, temperature_basis, created_by");
  if (error) return { error: `Could not read your brands: ${error.message}` };
  const matches = (brands ?? []).filter((b) => b.name.toLowerCase() === record.brand.toLowerCase());
  // Prefer the shared brand if the user also typed one of their own.
  const existing = matches.find((b) => b.created_by === null) ?? matches[0];

  let basis: TemperatureBasis;
  if (existing) {
    basis = existing.temperature_basis;
  } else if ((TEMPERATURE_BASES as readonly string[]).includes(record.temperature_basis)) {
    basis = record.temperature_basis as TemperatureBasis;
  } else {
    return { error: `${record.brand} is a new brand: say whether it rates its waxes by air or snow temperature.` };
  }

  const checked = readProduct(record, basis);
  if (!checked.row) return { error: inFormWords(checked.errors[0]) };
  return { row: checked.row, brandId: existing?.id ?? null, basis };
}

export async function ensureBrand(
  supabase: SupabaseClient,
  userId: string,
  wax: { row: ProductRow; brandId: string | null; basis: TemperatureBasis },
): Promise<{ id: string } | { error: string }> {
  if (wax.brandId) return { id: wax.brandId };
  const { data, error } = await supabase
    .from("brands")
    .insert({ name: wax.row.brand, temperature_basis: wax.basis, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: `Could not save the brand: ${error.message}` };
  return { id: data.id as string };
}

/** Other waxes of this brand with this name, ignoring case. */
export async function sameNamed(supabase: SupabaseClient, brandId: string, name: string) {
  const { data, error } = await supabase.from("products").select("id, name, created_by").eq("brand_id", brandId);
  if (error) throw new Error(`Could not read your waxes: ${error.message}`);
  return (data ?? []).filter((p) => p.name.toLowerCase() === name.toLowerCase());
}

export function productColumns(row: ProductRow) {
  const { brand: _brand, ...columns } = row;
  void _brand;
  return columns;
}


/**
 * A typed wax into the box: the shared catalogue's copy when one has this
 * brand and name, else the skier's own. Returns the box row, or the reason it
 * could not be added. "Already in your box" comes back as that row.
 */
export async function putWaxInBox(
  supabase: SupabaseClient,
  userId: string,
  record: Record<string, string>,
  extra: { amount_left: string; notes: string | null; photo_path: string | null },
): Promise<{ boxId: string; productId: string; already: boolean } | { error: string }> {
  // Everything is checked before anything is written.
  const wax = await checkWax(supabase, record);
  if (wax.error !== undefined) return { error: wax.error };

  const brand = await ensureBrand(supabase, userId, wax);
  if ("error" in brand) return { error: brand.error };

  // Already known (in the shared catalogue, or typed in before)? Use that one.
  const known = await sameNamed(supabase, brand.id, wax.row.name);
  let productId = (known.find((p) => p.created_by === null) ?? known[0])?.id as string | undefined;

  if (!productId) {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...productColumns(wax.row), brand_id: brand.id, created_by: userId })
      .select("id")
      .single();
    if (error) return { error: `Could not save the wax: ${error.message}` };
    productId = data.id as string;
  }
  return boxRowFor(supabase, userId, productId, extra);
}

/** A known wax into the box, or the row it already has there. */
export async function boxRowFor(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  extra: { amount_left: string; notes: string | null; photo_path: string | null } = { amount_left: "full", notes: null, photo_path: null },
): Promise<{ boxId: string; productId: string; already: boolean } | { error: string }> {
  const { data: added, error } = await supabase
    .from("user_products")
    .insert({ user_id: userId, product_id: productId, ...extra })
    .select("id")
    .single();
  if (error?.code === "23505") {
    // The one-row-per-wax constraint: it is in the box already.
    const { data: existing } = await supabase.from("user_products").select("id").eq("product_id", productId).maybeSingle();
    if (existing) return { boxId: existing.id as string, productId, already: true };
  }
  if (error) return { error: `Could not add it to your wax box: ${error.message}` };
  return { boxId: added.id as string, productId, already: false };
}
