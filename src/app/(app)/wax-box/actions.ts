"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { readProduct, type ProductRow } from "@/lib/catalogue/csv";
import { TEMPERATURE_BASES, type TemperatureBasis } from "@/lib/catalogue/vocab";
import { readSnowRange } from "@/lib/wax-box/snow-range";

export type WaxFormState = { error?: string };

// Field names that appear in readProduct's messages, in the form's words.
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
type Amount = (typeof AMOUNTS)[number];

const isAmount = (v: unknown): v is Amount => (AMOUNTS as readonly unknown[]).includes(v);

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

/** Form fields → the record shape a CSV row has, so one set of rules checks both. */
function formRecord(formData: FormData): Record<string, string> {
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
async function checkWax(supabase: SupabaseClient, record: Record<string, string>): Promise<CheckedWax> {
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

async function ensureBrand(
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
async function sameNamed(supabase: SupabaseClient, brandId: string, name: string) {
  const { data, error } = await supabase.from("products").select("id, name, created_by").eq("brand_id", brandId);
  if (error) throw new Error(`Could not read your waxes: ${error.message}`);
  return (data ?? []).filter((p) => p.name.toLowerCase() === name.toLowerCase());
}

function productColumns(row: ProductRow) {
  const { brand: _brand, ...columns } = row;
  void _brand;
  return columns;
}

/**
 * Adds one wax to the signed-in user's box. If the brand or the wax is new, it
 * is saved as the user's own (created_by = them) so it can be found next time;
 * only they can see it. Row Level Security enforces all of that again.
 */
export async function addWax(_prev: WaxFormState, formData: FormData): Promise<WaxFormState> {
  const { supabase, userId } = await signedIn();
  const record = formRecord(formData);

  const amount = record.amount_left || "full";
  if (!isAmount(amount)) return { error: "Choose how much is left." };

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

  const notes = (record.notes ?? "").trim() || null;
  // The photo picked on the form, already uploaded to the owner's "new" folder.
  const photo = String(formData.get("photo_path") ?? "");
  const photo_path = photo.startsWith(`${userId}/new/`) && !photo.includes("..") ? photo : null;
  const { data: added, error } = await supabase
    .from("user_products")
    .insert({ user_id: userId, product_id: productId, amount_left: amount, notes, photo_path })
    .select("id")
    .single();
  if (error) {
    // 23505: the one-row-per-wax constraint.
    if (error.code === "23505") return { error: `${wax.row.brand} ${wax.row.name} is already in your wax box.` };
    return { error: `Could not add it to your wax box: ${error.message}` };
  }

  redirect(`/wax-box?added=${added.id}`);
}

/**
 * Puts a wax that is already known (found by search) into the box. Used as a
 * plain form action, so it has no error state to return: a wax that is already
 * in the box just shows the box with that wax marked.
 */
export async function addKnownWax(productId: string) {
  const { supabase, userId } = await signedIn();
  const { data, error } = await supabase
    .from("user_products")
    .insert({ user_id: userId, product_id: productId, amount_left: "full" })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("user_products")
      .select("id")
      .eq("product_id", productId)
      .maybeSingle();
    redirect(existing ? `/wax-box?added=${existing.id}` : "/wax-box");
  }
  if (error) throw new Error(`Could not add it to your wax box: ${error.message}`);
  redirect(`/wax-box?added=${data.id}`);
}

/**
 * Edits a wax the user typed in, and its amount and notes. A shared catalogue
 * wax cannot be edited (RLS would refuse it too); only its amount and notes,
 * which are the user's own, can change — see setAmount and saveNotes.
 */
export async function updateWax(boxId: string, _prev: WaxFormState, formData: FormData): Promise<WaxFormState> {
  const { supabase, userId } = await signedIn();
  const record = formRecord(formData);

  const { data: box, error: boxError } = await supabase
    .from("user_products")
    .select("id, product:products!inner (id, created_by)")
    .eq("id", boxId)
    .maybeSingle();
  if (boxError) return { error: `Could not read the wax: ${boxError.message}` };
  if (!box) return { error: "That wax is no longer in your wax box." };
  const product = box.product as unknown as { id: string; created_by: string | null };
  if (product.created_by !== userId) {
    return { error: "This wax comes from the shared catalogue, so its details can't be changed here." };
  }

  const amount = record.amount_left || "full";
  if (!isAmount(amount)) return { error: "Choose how much is left." };

  const wax = await checkWax(supabase, record);
  if (wax.error !== undefined) return { error: wax.error };

  const brand = await ensureBrand(supabase, userId, wax);
  if ("error" in brand) return { error: brand.error };

  const clash = (await sameNamed(supabase, brand.id, wax.row.name)).find((p) => p.id !== product.id);
  if (clash) return { error: `You already have a wax called ${wax.row.brand} ${wax.row.name}.` };

  const { error: productError } = await supabase
    .from("products")
    .update({ ...productColumns(wax.row), brand_id: brand.id })
    .eq("id", product.id);
  if (productError) return { error: `Could not save the wax: ${productError.message}` };

  const { error: updateError } = await supabase
    .from("user_products")
    .update({ amount_left: amount, notes: (record.notes ?? "").trim() || null })
    .eq("id", boxId);
  if (updateError) return { error: `Could not save the amount and notes: ${updateError.message}` };

  redirect(`/wax-box/${boxId}`);
}

export async function setAmount(boxId: string, formData: FormData) {
  const { supabase } = await signedIn();
  const amount = formData.get("amount_left");
  if (!isAmount(amount)) return;
  await supabase.from("user_products").update({ amount_left: amount }).eq("id", boxId);
  refresh();
}

export async function saveNotes(boxId: string, _prev: WaxFormState, formData: FormData): Promise<WaxFormState> {
  const { supabase } = await signedIn();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const { error } = await supabase.from("user_products").update({ notes }).eq("id", boxId);
  if (error) return { error: `Could not save the notes: ${error.message}` };
  refresh();
  return {};
}

/**
 * Takes a wax out of the box. The wax itself is kept (the user's own stays
 * findable under "Find a wax you've added before"), and history that used it
 * keeps its record.
 */
export async function removeFromBox(boxId: string) {
  const { supabase } = await signedIn();
  // Its photo goes too: nothing else points at it.
  const { data: row } = await supabase.from("user_products").select("photo_path").eq("id", boxId).maybeSingle();
  await supabase.from("user_products").delete().eq("id", boxId);
  if (row?.photo_path) await supabase.storage.from("wax-photos").remove([row.photo_path as string]);
  redirect("/wax-box");
}

/**
 * Records a wax's photo (a key the browser has just uploaded to wax-photos),
 * or clears it with null, and removes the photo it replaces. Row Level
 * Security and the column's check keep both to the owner's own box and
 * folder. Returns an error message, or null.
 */
export async function setWaxPhoto(boxId: string, path: string | null): Promise<string | null> {
  const { supabase, userId } = await signedIn();
  if (path !== null && !path.startsWith(`${userId}/${boxId}/`)) return "That photo is not in your folder.";
  const { data: row, error } = await supabase.from("user_products").select("photo_path").eq("id", boxId).maybeSingle();
  if (error || !row) return "That wax is no longer in your box.";
  const { error: saveError } = await supabase.from("user_products").update({ photo_path: path }).eq("id", boxId);
  if (saveError) return `Could not save the photo: ${saveError.message}`;
  if (row.photo_path && row.photo_path !== path) await supabase.storage.from("wax-photos").remove([row.photo_path as string]);
  revalidatePath("/wax-box");
  refresh();
  return null;
}

/**
 * Saves the skier's own snow range for a wax (user_snow_ranges), so plans can
 * compare it with the snow. The shared catalogue row is never changed; Row
 * Level Security keeps the range to this skier and to waxes they can see.
 */
export async function saveSnowRange(productId: string, _prev: WaxFormState, formData: FormData): Promise<WaxFormState> {
  const { supabase, userId } = await signedIn();
  const { range, error } = readSnowRange(formData);
  if (error !== undefined) return { error };
  const { error: saveError } = await supabase
    .from("user_snow_ranges")
    .upsert({ user_id: userId, product_id: productId, ...range }, { onConflict: "user_id,product_id" });
  if (saveError) return { error: `Could not save the snow range: ${saveError.message}` };
  refresh();
  return {};
}

/** Removes the skier's own snow range for a wax; the wax goes back to having none. */
export async function clearSnowRange(productId: string) {
  const { supabase } = await signedIn();
  await supabase.from("user_snow_ranges").delete().eq("product_id", productId);
  refresh();
}
