"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readProduct } from "@/lib/catalogue/csv";
import { TEMPERATURE_BASES, type TemperatureBasis } from "@/lib/catalogue/vocab";

export type AddWaxState = { error?: string };

// Fields whose names appear in readProduct's messages, in the form's words.
const FIELD_WORDS: [RegExp, string][] = [
  [/published_temp_min_c|published_temp_max_c/g, "temperature"],
  [/snow_temp_min_c|snow_temp_max_c/g, "snow temperature"],
  [/published range/g, "The temperature range"],
  [/snow range/g, "The snow temperature range"],
  [/iron_temp_c/g, "Iron temperature"],
];

function inFormWords(message: string): string {
  return FIELD_WORDS.reduce((m, [pattern, words]) => m.replace(pattern, words), message);
}

const LIST_FIELDS = ["snow_types", "humidity_bands", "layer_roles"];

const AMOUNTS = ["full", "half", "low", "empty"] as const;

/**
 * Adds one wax to the signed-in user's box. If the brand or the wax is new, it
 * is saved as the user's own (created_by = them) so it can be picked next time;
 * only they can see it. Row Level Security enforces all of that again.
 */
export async function addWax(_prev: AddWaxState, formData: FormData): Promise<AddWaxState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // Form fields → the same record shape a CSV row has, so one set of rules
  // checks both. Checkbox groups arrive as several values; join them.
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$")) continue;
    record[key] = LIST_FIELDS.includes(key) && record[key] ? `${record[key]};${value}` : value;
  }

  const brandName = (record.brand ?? "").trim().replace(/\s+/g, " ");
  const waxName = (record.name ?? "").trim().replace(/\s+/g, " ");
  record.brand = brandName;
  record.name = waxName;
  if (!brandName) return { error: "Enter the brand." };
  if (!waxName) return { error: "Enter the wax's name." };

  // The brands this user can see: the shared catalogue and their own. Matched
  // ignoring case, so "swix" finds "Swix" instead of starting a second brand.
  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("id, name, temperature_basis, created_by");
  if (brandsError) return { error: `Could not read your brands: ${brandsError.message}` };
  const matches = (brands ?? []).filter((b) => b.name.toLowerCase() === brandName.toLowerCase());
  // Prefer the shared brand if the user also typed one of their own.
  const existingBrand = matches.find((b) => b.created_by === null) ?? matches[0];

  let basis: TemperatureBasis | undefined = existingBrand?.temperature_basis;
  if (!existingBrand) {
    const typed = record.temperature_basis;
    if (!(TEMPERATURE_BASES as readonly string[]).includes(typed)) {
      return { error: `${brandName} is a new brand: say whether it rates its waxes by air or snow temperature.` };
    }
    basis = typed as TemperatureBasis;
  }

  const amount = record.amount_left || "full";
  if (!(AMOUNTS as readonly string[]).includes(amount)) return { error: "Choose how much is left." };

  // Everything is checked before anything is written.
  const checked = readProduct(record, basis);
  if (!checked.row) return { error: inFormWords(checked.errors[0]) };

  let brandId = existingBrand?.id as string | undefined;
  if (!brandId) {
    const { data, error } = await supabase
      .from("brands")
      .insert({ name: brandName, temperature_basis: basis, created_by: user.id })
      .select("id")
      .single();
    if (error) return { error: `Could not save the brand: ${error.message}` };
    brandId = data.id as string;
  }

  // Is this wax already known (in the shared catalogue or typed before)?
  const { data: sameBrand, error: productsError } = await supabase
    .from("products")
    .select("id, name, created_by")
    .eq("brand_id", brandId);
  if (productsError) return { error: `Could not read your waxes: ${productsError.message}` };
  const known = (sameBrand ?? []).filter((p) => p.name.toLowerCase() === waxName.toLowerCase());
  let productId = (known.find((p) => p.created_by === null) ?? known[0])?.id as string | undefined;

  if (productId) {
    const { count } = await supabase
      .from("user_products")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    if ((count ?? 0) > 0) {
      return { error: `${brandName} ${waxName} is already in your wax box.` };
    }
  } else {
    const { brand: _brand, ...product } = checked.row;
    void _brand;
    const { data, error } = await supabase
      .from("products")
      .insert({ ...product, brand_id: brandId, created_by: user.id })
      .select("id")
      .single();
    if (error) return { error: `Could not save the wax: ${error.message}` };
    productId = data.id as string;
  }

  const notes = (record.notes ?? "").trim() || null;
  const { data: added, error: boxError } = await supabase
    .from("user_products")
    .insert({ user_id: user.id, product_id: productId, amount_left: amount, notes })
    .select("id")
    .single();
  if (boxError) return { error: `Could not add it to your wax box: ${boxError.message}` };

  redirect(`/wax-box?added=${added.id}`);
}
