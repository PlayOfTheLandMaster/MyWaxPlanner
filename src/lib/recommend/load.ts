import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Candidate, Conditions, HistoryRow, Mode, Request, Rule, GripType } from "./engine";
import { recommend, toolKey } from "./engine";
import type { SkiCategory, Technique } from "@/lib/skis/input";
import { loadSnowRanges } from "@/lib/wax-box/load";
import { applySnowRanges } from "@/lib/wax-box/snow-range";
import { airHumidityBand, type DraftConditions } from "@/lib/plan/draft";

// Everything the engine needs, read as the signed-in skier (Row Level
// Security limits it to their box, tools, skis and history plus the shared
// catalogue and rules).

const PRODUCT = `id, created_by, name, category, category_group, form, published_temp_min_c,
  published_temp_max_c, temp_min_c, temp_max_c, snow_types, humidity_bands, layer_roles,
  fluoro_status, iron_temp_c, price, currency, buy_url, brand:brands!inner (name, temperature_basis)`;

export type PlanConditions = Conditions & {
  id: string;
  observed_at: string;
  venue_id: string | null;
  venue: { name: string } | null;
  snow_temp_estimated: boolean;
  air_rh_pct: number | null;
  notes: string | null;
};

export type PlanSki = {
  id: string;
  skier_id: string | null;
  name: string;
  technique: Technique;
  category: SkiCategory | null;
  grind: string | null;
  grip_zone_cm: number | null;
};

export async function loadConditions(supabase: SupabaseClient, id: string): Promise<PlanConditions | null> {
  const { data, error } = await supabase
    .from("conditions")
    .select(
      "id, observed_at, venue_id, snow_temp_c, snow_temp_estimated, air_temp_c, air_rh_pct, snow_type, snow_humidity_band, air_humidity_band, new_snow_cm, notes, venue:venues (name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    throw new Error(`Could not read the conditions: ${error.message}`);
  }
  if (!data) return null;
  const c = data as unknown as PlanConditions;
  return { ...c, snow_temp_c: c.snow_temp_c === null ? null : Number(c.snow_temp_c), air_temp_c: c.air_temp_c === null ? null : Number(c.air_temp_c) };
}

/**
 * A plan's conditions that have not been saved yet (they travel in the
 * address until "Use this plan"). The venue must be one the skier can see,
 * which Row Level Security decides; otherwise there is nothing to plan for.
 */
export async function draftConditions(supabase: SupabaseClient, d: DraftConditions): Promise<PlanConditions | null> {
  const { data: venue } = await supabase.from("venues").select("name").eq("id", d.venue_id).maybeSingle();
  if (!venue) return null;
  return {
    ...d,
    id: "draft",
    venue: { name: venue.name as string },
    air_humidity_band: airHumidityBand(d.air_rh_pct),
  };
}

export async function loadSkis(supabase: SupabaseClient): Promise<PlanSki[]> {
  const { data } = await supabase.from("skis").select("id, skier_id, name, technique, category, grind, grip_zone_cm").order("name");
  return (data ?? []) as PlanSki[];
}

export async function loadDefaultMode(supabase: SupabaseClient): Promise<Mode> {
  const { data } = await supabase.from("profiles").select("default_mode").maybeSingle();
  return (data?.default_mode as Mode | undefined) ?? "recreational";
}

const asNumber = (n: unknown) => (n === null || n === undefined ? null : Number(n));

function normalise(p: Record<string, unknown>): Omit<Candidate, "user_product_id" | "amount_left"> {
  return {
    ...(p as unknown as Candidate),
    temp_min_c: asNumber(p.temp_min_c),
    temp_max_c: asNumber(p.temp_max_c),
    published_temp_min_c: asNumber(p.published_temp_min_c),
    published_temp_max_c: asNumber(p.published_temp_max_c),
    price: asNumber(p.price),
  };
}

export type PlanChoice = {
  technique: Technique;
  gripType: GripType;
  mode: Mode;
  family: string;
  ski: PlanSki | null;
};

/** Load the data and run the engine. Used both to show a plan and to save it, so a saved plan is the one shown. */
export async function buildRecommendation(supabase: SupabaseClient, conditions: PlanConditions, choice: PlanChoice) {
  const [rules, box, catalogue, tools, history, snowRanges] = await Promise.all([
    supabase
      .from("rules")
      .select("technique, mode, layer_role, snow_temp_min_c, snow_temp_max_c, snow_types, snow_humidity_bands, product_category, weight, notes")
      .eq("active", true),
    supabase.from("user_products").select(`id, amount_left, product:products!inner (${PRODUCT})`),
    supabase.from("products").select(PRODUCT).is("created_by", null).eq("active", true),
    supabase.from("user_tools").select("tool:tools!inner (type, sub_type)"),
    supabase
      .from("wax_session_list")
      .select("snow_temp_c, product_ids, glide_rating, grip_rating")
      .eq("status", "completed")
      .not("snow_temp_c", "is", null),
    // The skier's own snow ranges: the only way an air-rated wax (every
    // shared-catalogue wax) gets a snow range the engine can compare.
    loadSnowRanges(supabase),
  ]);
  const failed = rules.error ?? box.error ?? catalogue.error ?? tools.error ?? history.error;
  if (failed) throw new Error(`Could not read the data for a plan: ${failed.message}`);

  const boxCandidates: Candidate[] = applySnowRanges(
    (box.data ?? []).map((r) => ({
      ...normalise(r.product as unknown as Record<string, unknown>),
      user_product_id: r.id as string,
      amount_left: r.amount_left as Candidate["amount_left"],
    })),
    snowRanges,
  );
  const catalogueCandidates: Candidate[] = applySnowRanges(
    (catalogue.data ?? []).map((p) => ({
      ...normalise(p as unknown as Record<string, unknown>),
      user_product_id: null,
      amount_left: null,
    })),
    snowRanges,
  );
  const owned = new Set(
    (tools.data ?? []).map((t) => {
      const tool = t.tool as unknown as { type: string; sub_type: string | null };
      return toolKey(tool.type, tool.sub_type);
    }),
  );
  const ruleRows = (rules.data ?? []).map((r) => ({
    ...r,
    snow_temp_min_c: asNumber(r.snow_temp_min_c),
    snow_temp_max_c: asNumber(r.snow_temp_max_c),
    weight: Number(r.weight),
  })) as Rule[];
  const historyRows = (history.data ?? []).map((h) => ({ ...h, snow_temp_c: asNumber(h.snow_temp_c) })) as HistoryRow[];

  const req: Request = {
    technique: choice.technique,
    gripType: choice.technique === "classic" ? choice.gripType : null,
    mode: choice.mode,
    family: choice.family,
    conditions,
    ski: choice.ski,
  };
  return { req, result: recommend(req, ruleRows, boxCandidates, catalogueCandidates, historyRows, owned), catalogueSize: catalogueCandidates.length };
}
