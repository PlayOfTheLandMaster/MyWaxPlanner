import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InsightSession } from "./insights";

// Insights' read: every finished session for one skier (or everyone), with the
// waxes used. Runs as the signed-in user, so Row Level Security keeps it to
// their own history.

const PAGE = 1000;
const MAX = 5000;
const CHUNK = 100;

export async function loadInsightSessions(supabase: SupabaseClient, skier: string | undefined): Promise<InsightSession[]> {
  const rows: Omit<InsightSession, "waxes">[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    let q = supabase
      .from("wax_session_list")
      .select("id, technique, snow_temp_c, glide_rating, grip_rating")
      .eq("status", "completed")
      .order("occurred_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (skier === "me") q = q.is("skier_id", null);
    else if (skier && skier !== "all") q = q.eq("skier_id", skier);
    const { data, error } = await q;
    if (error) throw new Error(`Could not read your history: ${error.message}`);
    rows.push(...((data ?? []) as Omit<InsightSession, "waxes">[]));
    if ((data ?? []).length < PAGE) break;
  }

  const waxes = new Map<string, InsightSession["waxes"]>();
  for (let i = 0; i < rows.length; i += CHUNK) {
    const ids = rows.slice(i, i + CHUNK).map((r) => r.id);
    const { data, error } = await supabase
      .from("wax_session_layers")
      .select("session_id, zone, layer_role, custom_product, product:products (name, brand:brands (name))")
      .in("session_id", ids);
    if (error) throw new Error(`Could not read your waxes: ${error.message}`);
    for (const l of (data ?? []) as unknown as {
      session_id: string;
      zone: "glide" | "grip";
      layer_role: string | null;
      custom_product: string | null;
      product: { name: string; brand: { name: string } | null } | null;
    }[]) {
      if (l.layer_role === "cleaning") continue;
      const name = l.product ? [l.product.brand?.name, l.product.name].filter(Boolean).join(" ") : l.custom_product?.trim();
      if (!name) continue;
      waxes.set(l.session_id, [...(waxes.get(l.session_id) ?? []), { zone: l.zone, name }]);
    }
  }
  return rows.map((r) => ({ ...r, snow_temp_c: r.snow_temp_c === null ? null : Number(r.snow_temp_c), waxes: waxes.get(r.id) ?? [] }));
}
