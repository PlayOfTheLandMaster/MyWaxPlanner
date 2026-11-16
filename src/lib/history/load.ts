import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkiCategory, Technique } from "@/lib/skis/input";
import type { PlannedLayer } from "./plan-compare";

// The history's reads. All run as the signed-in user, so Row Level Security
// limits them to that skier's own sessions, skis, venues and wax box.

export type SkiOption = { id: string; name: string; technique: Technique; category: SkiCategory | null };
export type VenueOption = { id: string; name: string };
export type WaxOption = {
  id: string; // user_products.id
  label: string; // "Swix Blue Extra"
  group: string; // glide | grip | solvent | consumable
  layer_roles: string[];
  iron_temp_c: number | null;
};

export type FormOptions = { skis: SkiOption[]; venues: VenueOption[]; waxes: WaxOption[] };

export async function loadFormOptions(supabase: SupabaseClient): Promise<FormOptions> {
  const [skis, venues, box] = await Promise.all([
    supabase.from("skis").select("id, name, technique, category, skier:skiers (name)").order("name"),
    supabase.from("venues").select("id, name").order("name"),
    supabase
      .from("user_products")
      .select("id, product:products!inner (name, category_group, layer_roles, iron_temp_c, brand:brands!inner (name))"),
  ]);
  const failed = skis.error ?? venues.error ?? box.error;
  if (failed) throw new Error(`Could not read your skis, venues and waxes: ${failed.message}`);

  type BoxRow = {
    id: string;
    product: { name: string; category_group: string; layer_roles: string[]; iron_temp_c: number | null; brand: { name: string } };
  };
  const waxes = ((box.data ?? []) as unknown as BoxRow[])
    .map((r) => ({
      id: r.id,
      label: `${r.product.brand.name} ${r.product.name}`,
      group: r.product.category_group,
      layer_roles: r.product.layer_roles,
      iron_temp_c: r.product.iron_temp_c,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // A pair that belongs to one of the account's skiers is labelled with their name.
  const skiOptions = (skis.data ?? []).map((k) => {
    const owner = (k.skier as unknown as { name: string } | null)?.name;
    return { id: k.id, technique: k.technique, category: k.category, name: owner ? `${owner}: ${k.name}` : k.name } as SkiOption;
  });
  return { skis: skiOptions, venues: (venues.data ?? []) as VenueOption[], waxes };
}

export type SessionLayer = {
  id: string;
  zone: "glide" | "grip";
  position: number;
  layer_role: string | null;
  product_id: string | null;
  user_product_id: string | null;
  custom_product: string | null;
  method: string | null;
  iron_temp_c: number | null;
  passes: number | null;
  scrape_brush_steps: string | null;
  notes: string | null;
  product: { name: string; fluoro_status: string; brand: { name: string } } | null;
};

export type Conditions = {
  air_temp_c: number | null;
  snow_temp_c: number | null;
  snow_temp_estimated: boolean;
  air_rh_pct: number | null;
  air_humidity_band: string | null;
  snow_humidity_band: string | null;
  snow_type: string | null;
  new_snow_cm: number | null;
  sky: string | null;
  wind_kmh: number | null;
  track: string | null;
};

export type Session = {
  id: string;
  occurred_at: string;
  status: "planned" | "completed";
  technique: Technique;
  mode: "recreational" | "race";
  ski_id: string | null;
  venue_id: string | null;
  event_name: string | null;
  event_distance_km: number | null;
  event_result: string | null;
  finish_notes: string | null;
  finish_tags: string[];
  glide_rating: number | null;
  grip_rating: number | null;
  durability_rating: number | null;
  durability_km: number | null;
  durability_hours: number | null;
  kick_feel: "slipping" | "good" | "icing" | null;
  notes: string | null;
  ski: { name: string } | null;
  skier: { name: string } | null;
  venue: { name: string } | null;
  actual: Conditions | null;
  forecast: Conditions | null;
  layers: SessionLayer[];
  photos: { id: string; storage_path: string; caption: string | null }[];
  /** What the app recommended, when the session came from a plan. */
  plan: SessionPlan | null;
  /** Procedure steps ticked (0-based positions in plan.steps). */
  wax_steps_done: number[];
  /** When the skier finished waxing, if they have. */
  waxed_at: string | null;
};

export type SessionPlan = {
  /** The wax the plan picked for each layer (by zone and role), for comparing with what was used. */
  picks: PlannedLayer[];
  /** The procedure, in order, grouped by section ("Glide", "Grip", "Finish"…). */
  steps: { section: string; text: string }[];
  /** Why each layer was picked, by zone and role. */
  reasons: { zone: string; layer_role: string; reason: string | null; fit: string | null }[];
};

const CONDITION_COLUMNS = `air_temp_c, snow_temp_c, snow_temp_estimated, air_rh_pct, air_humidity_band,
  snow_humidity_band, snow_type, new_snow_cm, sky, wind_kmh, track`;

export async function loadSession(supabase: SupabaseClient, id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("wax_sessions")
    .select(
      `id, occurred_at, status, technique, mode, ski_id, venue_id, event_name, event_distance_km,
       event_result, finish_notes, finish_tags, glide_rating, grip_rating, durability_rating,
       durability_km, durability_hours, kick_feel, notes, actual_conditions_id, forecast_conditions_id,
       recommendation_id, wax_steps_done, waxed_at,
       ski:skis (name), skier:skiers (name), venue:venues (name),
       layers:wax_session_layers (id, zone, position, layer_role, product_id, user_product_id, custom_product,
         method, iron_temp_c, passes, scrape_brush_steps, notes,
         product:products (name, fluoro_status, brand:brands (name))),
       photos:wax_session_photos (id, storage_path, caption)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "22P02") return null; // not a uuid: simply not found
    throw new Error(`Could not read the session: ${error.message}`);
  }
  if (!data) return null;

  // Two foreign keys point at conditions, so they are read by id rather than
  // embedded, which would need the constraint names spelled out.
  const ids = [data.actual_conditions_id, data.forecast_conditions_id].filter(Boolean) as string[];
  const conds = new Map<string, Conditions>();
  if (ids.length) {
    const { data: rows } = await supabase.from("conditions").select(`id, ${CONDITION_COLUMNS}`).in("id", ids);
    for (const r of rows ?? []) conds.set(r.id as string, r as unknown as Conditions);
  }

  let plan: SessionPlan | null = null;
  if (data.recommendation_id) {
    const { data: rec } = await supabase
      .from("recommendations")
      .select("procedure_steps, layers")
      .eq("id", data.recommendation_id)
      .maybeSingle();
    if (rec) {
      const steps = Array.isArray(rec.procedure_steps) ? rec.procedure_steps : [];
      const layers = Array.isArray(rec.layers) ? rec.layers : [];
      // Names of the waxes the plan picked; one read for all of them.
      const pickIds = [...new Set(layers.map((l: Record<string, unknown>) => l.product_id).filter((x: unknown): x is string => typeof x === "string"))];
      const names = new Map<string, string>();
      if (pickIds.length) {
        const { data: prods } = await supabase.from("products").select("id, name, brand:brands (name)").in("id", pickIds);
        for (const p of prods ?? []) {
          const brand = (p.brand as unknown as { name: string } | null)?.name;
          names.set(p.id as string, brand ? `${brand} ${p.name}` : (p.name as string));
        }
      }
      plan = {
        picks: layers.map((l: Record<string, unknown>) => ({
          zone: String(l.zone ?? ""),
          layer_role: String(l.layer_role ?? ""),
          product_id: typeof l.product_id === "string" ? l.product_id : null,
          name: typeof l.product_id === "string" ? (names.get(l.product_id) ?? null) : null,
        })),
        steps: steps
          .filter((x: { text?: unknown }) => typeof x?.text === "string")
          .map((x: { section?: unknown; text: string }) => ({ section: typeof x.section === "string" ? x.section : "", text: x.text })),
        reasons: layers.map((l: Record<string, unknown>) => ({
          zone: String(l.zone ?? ""),
          layer_role: String(l.layer_role ?? ""),
          reason: typeof l.reason === "string" ? l.reason : null,
          fit: typeof l.fit === "string" ? l.fit : null,
        })),
      };
    }
  }

  const session = data as unknown as Session & {
    actual_conditions_id: string | null;
    forecast_conditions_id: string | null;
    recommendation_id: string | null;
  };
  session.layers.sort((a, b) => (a.zone === b.zone ? a.position - b.position : a.zone === "glide" ? -1 : 1));
  return {
    ...session,
    actual: session.actual_conditions_id ? (conds.get(session.actual_conditions_id) ?? null) : null,
    forecast: session.forecast_conditions_id ? (conds.get(session.forecast_conditions_id) ?? null) : null,
    plan,
    wax_steps_done: (session.wax_steps_done ?? []).map(Number),
  };
}
