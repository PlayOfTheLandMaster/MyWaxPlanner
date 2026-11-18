"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkWax, ensureBrand, formRecord, isAmount, productColumns, putWaxInBox, sameNamed } from "@/lib/wax-box/create";
import { readIronTemp, readSnowRange } from "@/lib/wax-box/snow-range";

export type WaxFormState = { error?: string };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
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

  const notes = (record.notes ?? "").trim() || null;
  // The photo picked on the form, already uploaded to the owner's "new" folder.
  const photo = String(formData.get("photo_path") ?? "");
  const photo_path = photo.startsWith(`${userId}/new/`) && !photo.includes("..") ? photo : null;
  const result = await putWaxInBox(supabase, userId, record, { amount_left: amount, notes, photo_path });
  if ("error" in result) return { error: result.error };
  if (result.already) return { error: `${record.brand} ${record.name} is already in your wax box.` };

  redirect(`/wax-box?added=${result.boxId}`);
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

/** Removes the skier's own snow range for a wax; the wax goes back to having none. Their iron temperature stays. */
export async function clearSnowRange(productId: string) {
  const { supabase } = await signedIn();
  await supabase
    .from("user_snow_ranges")
    .update({ temp_min_c: null, temp_max_c: null, old_temp_min_c: null, old_temp_max_c: null })
    .eq("product_id", productId);
  await removeEmptyRange(supabase, productId);
  refresh();
}

/** A row with nothing left in it goes, so "Remove" leaves no trace. */
async function removeEmptyRange(supabase: SupabaseClient, productId: string) {
  await supabase
    .from("user_snow_ranges")
    .delete()
    .eq("product_id", productId)
    .is("temp_min_c", null)
    .is("temp_max_c", null)
    .is("old_temp_min_c", null)
    .is("old_temp_max_c", null)
    .is("iron_temp_c", null);
}

/**
 * Saves the skier's own iron temperature for a shared wax the maker gives
 * none for (user_snow_ranges.iron_temp_c). Plans and the wax-along use it.
 * Blank clears it. The snow range in the same row is left as it was.
 */
export async function saveIronTemp(productId: string, _prev: WaxFormState, formData: FormData): Promise<WaxFormState> {
  const { supabase, userId } = await signedIn();
  const { iron, error } = readIronTemp(formData);
  if (error !== undefined) return { error };
  const { error: saveError } = await supabase
    .from("user_snow_ranges")
    .upsert({ user_id: userId, product_id: productId, iron_temp_c: iron }, { onConflict: "user_id,product_id" });
  if (saveError) return { error: `Could not save the iron temperature: ${saveError.message}` };
  if (iron === null) await removeEmptyRange(supabase, productId);
  refresh();
  return {};
}
