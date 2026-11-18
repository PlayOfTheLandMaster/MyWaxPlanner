import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KnownBrand } from "@/app/(app)/wax-box/wax-form";
import type { FluoroStatus, ProductCategory, TemperatureBasis } from "@/lib/catalogue/vocab";
import type { AMOUNT_LABELS } from "@/lib/catalogue/labels";
import { applySnowRanges, type SnowRange } from "./snow-range";

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
  /** True when temp_min_c / temp_max_c are the skier's own snow range (user_snow_ranges). */
  snow_range_is_yours?: boolean;
};

export type BoxRow = {
  id: string;
  amount_left: keyof typeof AMOUNT_LABELS;
  notes: string | null;
  /** Key in the private wax-photos bucket: <user_id>/<box row id>/<file>, or null. */
  photo_path: string | null;
  product: Product;
};

const PRODUCT_COLUMNS = `id, created_by, name, category, category_group, form, published_temp_min_c,
  published_temp_max_c, temp_min_c, temp_max_c, snow_types, humidity_bands, layer_roles,
  fluoro_status, iron_temp_c, brand:brands!inner (name, temperature_basis)`;

/** The skier's own snow ranges, by wax id. Row Level Security returns only theirs. */
export async function loadSnowRanges(supabase: SupabaseClient): Promise<Map<string, SnowRange>> {
  const { data, error } = await supabase.from("user_snow_ranges").select("product_id, temp_min_c, temp_max_c");
  if (error) throw new Error(`Could not read your snow ranges: ${error.message}`);
  const num = (n: unknown) => (n === null || n === undefined ? null : Number(n));
  return new Map(
    (data ?? []).map((r) => [r.product_id as string, { temp_min_c: num(r.temp_min_c), temp_max_c: num(r.temp_max_c) }]),
  );
}

/** Each box row's wax with the skier's own snow range applied where they have one. */
function withSnowRanges(rows: BoxRow[], ranges: Map<string, SnowRange>): BoxRow[] {
  const products = applySnowRanges(
    rows.map((r) => r.product),
    ranges,
  );
  return rows.map((r, i) => ({ ...r, product: products[i] }));
}

export async function loadBox(supabase: SupabaseClient): Promise<BoxRow[]> {
  const [{ data, error }, ranges] = await Promise.all([
    supabase
      .from("user_products")
      .select(`id, amount_left, notes, photo_path, product:products!inner (${PRODUCT_COLUMNS})`)
      .order("created_at", { ascending: false }),
    loadSnowRanges(supabase),
  ]);
  if (error) throw new Error(`Could not read your wax box: ${error.message}`);
  return withSnowRanges((data ?? []) as unknown as BoxRow[], ranges);
}

export async function loadBoxRow(supabase: SupabaseClient, id: string): Promise<BoxRow | null> {
  const [{ data, error }, ranges] = await Promise.all([
    supabase
      .from("user_products")
      .select(`id, amount_left, notes, photo_path, product:products!inner (${PRODUCT_COLUMNS})`)
      .eq("id", id)
      .maybeSingle(),
    loadSnowRanges(supabase),
  ]);
  if (error) {
    // An id that is not a uuid is simply not found.
    if (error.code === "22P02") return null;
    throw new Error(`Could not read the wax: ${error.message}`);
  }
  if (!data) return null;
  return withSnowRanges([data as unknown as BoxRow], ranges)[0];
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

/** Short-lived links to the box's wax photos, by storage key. Private bucket, so each is signed. */
export async function waxPhotoUrls(supabase: SupabaseClient, paths: (string | null)[]): Promise<Map<string, string>> {
  const keys = paths.filter((p): p is string => Boolean(p));
  if (keys.length === 0) return new Map();
  const { data } = await supabase.storage.from("wax-photos").createSignedUrls(keys, 3600);
  return new Map((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl as string]));
}
