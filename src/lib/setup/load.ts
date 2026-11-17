import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadHomeVenueId } from "@/lib/venues/load";
import { readStyle } from "@/lib/profile/style";
import { setupSteps, type Step } from "./steps";

/** The checklist's four facts, each a count-only read under RLS. */
export async function loadSetupSteps(supabase: SupabaseClient): Promise<Step[]> {
  const [home, skiers, skis, waxes, tools, profile] = await Promise.all([
    loadHomeVenueId(supabase),
    supabase.from("skiers").select("id", { count: "exact", head: true }),
    supabase.from("skis").select("id", { count: "exact", head: true }),
    supabase.from("user_products").select("id", { count: "exact", head: true }),
    supabase.from("user_tools").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("waxing_style").maybeSingle(),
  ]);
  return setupSteps({
    style: readStyle(profile.data?.waxing_style),
    home: home !== null,
    skiers: skiers.count ?? 0,
    skis: skis.count ?? 0,
    waxes: waxes.count ?? 0,
    tools: tools.count ?? 0,
  });
}
