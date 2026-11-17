import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CopySki, CopySource } from "@/lib/history/copy";

/** The session to copy and every pair on the account, read under RLS. */
export async function loadCopy(supabase: SupabaseClient, id: string) {
  const [session, skis] = await Promise.all([
    supabase
      .from("wax_sessions")
      .select(
        "id, ski_id, skier_id, occurred_at, status, technique, mode, venue_id, event_name, event_distance_km, finish_notes, finish_tags, forecast_conditions_id, recommendation_id, layers:wax_session_layers (zone, position, layer_role, user_product_id, product_id, custom_product, method, iron_temp_c, passes, scrape_brush_steps, notes)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("skis").select("id, name, technique, skier_id"),
  ]);
  return {
    source: session.data as (CopySource & { id: string; ski_id: string | null; skier_id: string | null }) | null,
    skis: (skis.data ?? []) as CopySki[],
  };
}
