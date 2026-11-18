"use server";

// Adding a wax on the fly from a wax job's layer: search the catalogue (and
// the skier's own waxes), put the one picked into the box, or quick-add a new
// one. Each returns the box row as the layer's pull-down lists it, so the
// layer can select it without the page reloading.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadProducts } from "@/lib/wax-box/load";
import { searchWaxes } from "@/lib/wax-box/search";
import { boxRowFor, formRecord, putWaxInBox } from "@/lib/wax-box/create";
import { CATEGORY_GROUPS, CATEGORY_LABELS } from "@/lib/catalogue/labels";
import type { WaxOption } from "@/lib/history/load";

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export type FoundWax = { productId: string; label: string; type: string; inBox: boolean };
export type AddedWax = { wax: WaxOption; error?: undefined } | { wax?: undefined; error: string };

/** The layer's zone and the cleaners and consumables any layer may use. */
const groupsFor = (zone: "glide" | "grip") => new Set([zone, "solvent", "consumable"]);

/** Up to eight waxes matching what was typed, for a glide or grip layer. */
export async function findLayerWaxes(query: string, zone: "glide" | "grip"): Promise<FoundWax[]> {
  const { supabase } = await signedIn();
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  const [products, box] = await Promise.all([loadProducts(supabase), supabase.from("user_products").select("product_id")]);
  const inBox = new Set((box.data ?? []).map((r) => r.product_id as string));
  const groups = groupsFor(zone === "grip" ? "grip" : "glide");
  return searchWaxes(
    products.filter((p) => groups.has(p.category_group)),
    q,
    new Set(),
    8,
  ).map((p) => ({ productId: p.id, label: `${p.brand.name} ${p.name}`, type: CATEGORY_LABELS[p.category], inBox: inBox.has(p.id) }));
}

/** The box row as the layer's pull-down lists it. */
async function asOption(boxId: string): Promise<AddedWax> {
  const { supabase } = await signedIn();
  const { data, error } = await supabase
    .from("user_products")
    .select("id, product_id, product:products!inner (name, category_group, layer_roles, iron_temp_c, brand:brands!inner (name))")
    .eq("id", boxId)
    .maybeSingle();
  if (error || !data) return { error: "It was added, but could not be read back. Reload the page to pick it." };
  const p = data.product as unknown as { name: string; category_group: string; layer_roles: string[]; iron_temp_c: number | null; brand: { name: string } };
  // The maker's iron temperature first, else the skier's own (Your iron temperature).
  let iron = p.iron_temp_c;
  if (iron == null) {
    const { data: own } = await supabase.from("user_snow_ranges").select("iron_temp_c").eq("product_id", data.product_id as string).maybeSingle();
    iron = own?.iron_temp_c != null ? Number(own.iron_temp_c) : null;
  }
  revalidatePath("/wax-box");
  return { wax: { id: data.id as string, label: `${p.brand.name} ${p.name}`, group: p.category_group, layer_roles: p.layer_roles, iron_temp_c: iron } };
}

/** A wax found by the search into the box (or the row it already has there). */
export async function addLayerWax(productId: string): Promise<AddedWax> {
  const { supabase, userId } = await signedIn();
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { error: "Search again and pick the wax." };
  const r = await boxRowFor(supabase, userId, productId);
  if ("error" in r) return { error: r.error };
  return asOption(r.boxId);
}

/** A wax not in the catalogue: maker, name and type, into the box as the skier's own. */
export async function quickAddLayerWax(zone: "glide" | "grip", form: FormData): Promise<AddedWax> {
  const { supabase, userId } = await signedIn();
  const record = formRecord(form);
  const allowed = CATEGORY_GROUPS.filter((g) => groupsFor(zone).has(g.key)).flatMap((g) => g.categories as string[]);
  if (!allowed.includes(record.category ?? "")) return { error: "Choose what kind of wax it is." };
  const r = await putWaxInBox(supabase, userId, record, { amount_left: "full", notes: null, photo_path: null });
  if ("error" in r) return { error: r.error };
  return asOption(r.boxId);
}
