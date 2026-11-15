import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KnownBrand } from "@/app/(app)/wax-box/wax-form";
import type { FluoroStatus, ProductCategory, TemperatureBasis } from "@/lib/catalogue/vocab";
import type { AMOUNT_LABELS } from "@/lib/catalogue/labels";

// The wax box's reads. Every one runs through the signed-in user's client, so
// Row Level Security decides what comes back: the shared catalogue plus the
// user's own brands and waxes, and only the user's own box.

export type Product = {
  id: string;
  created_by: string | null;
  name: string;
  category: ProductCategory;
  category_group: string;
  form: string | null;
  published_temp_min_c: number | null;
  published_temp_max_c: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  snow_types: string[];
  humidity_bands: string[];
  layer_roles: string[];
  fluoro_status: FluoroStatus;
  iron_temp_c: number | null;
  brand: { name: string; temperature_basis: TemperatureBasis };
};

export type BoxRow = {
  id: string;
  amount_left: keyof typeof AMOUNT_LABELS;
  notes: string | null;
  product: Product;
};

const PRODUCT_COLUMNS = `id, created_by, name, category, category_group, form, published_temp_min_c,
  published_temp_max_c, temp_min_c, temp_max_c, snow_types, humidity_bands, layer_roles,
  fluoro_status, iron_temp_c, brand:brands!inner (name, temperature_basis)`;

export async function loadBox(supabase: SupabaseClient): Promise<BoxRow[]> {
  const { data, error } = await supabase
    .from("user_products")
    .select(`id, amount_left, notes, product:products!inner (${PRODUCT_COLUMNS})`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not read your wax box: ${error.message}`);
  return (data ?? []) as unknown as BoxRow[];
}

export async function loadBoxRow(supabase: SupabaseClient, id: string): Promise<BoxRow | null> {
  const { data, error } = await supabase
    .from("user_products")
    .select(`id, amount_left, notes, product:products!inner (${PRODUCT_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    // An id that is not a uuid is simply not found.
    if (error.code === "22P02") return null;
    throw new Error(`Could not read the wax: ${error.message}`);
  }
  return data as unknown as BoxRow | null;
}

/** Every wax the user can see, for the search on Add a wax. */
export async function loadProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).eq("active", true);
  if (error) throw new Error(`Could not read your waxes: ${error.message}`);
  return (data ?? []) as unknown as Product[];
}

/** Brands for the brand field's suggestions, each name once. */
export async function loadBrands(supabase: SupabaseClient): Promise<KnownBrand[]> {
  const { data } = await supabase.from("brands").select("name, temperature_basis").order("name");
  // A brand can be in the shared catalogue and typed by the user too; list it once.
  const seen = new Set<string>();
  const brands: KnownBrand[] = [];
  for (const b of data ?? []) {
    const key = b.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    brands.push(b);
  }
  return brands;
}
