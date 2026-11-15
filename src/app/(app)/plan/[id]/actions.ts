"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildRecommendation, loadConditions, loadSkis, type PlanChoice } from "@/lib/recommend/load";
import { CATEGORY_TEXT, ROLE_TEXT } from "@/lib/recommend/engine";

export type SavePlanState = { error?: string };

/**
 * Save the plan: the recommendation itself, and a planned session in the
 * history built from it, so after skiing the skier only adds what happened.
 * The plan is worked out again here from the same inputs rather than taken
 * from the page, so what is saved is exactly what the engine says.
 */
export async function savePlan(
  conditionsId: string,
  choice: { technique: string; gripType: string | null; mode: string; family: string; skiId: string | null; owner: string },
  prev: SavePlanState,
): Promise<SavePlanState> {
  void prev; // useActionState passes the last result; a save starts fresh
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const conditions = await loadConditions(supabase, conditionsId);
  if (!conditions) return { error: "Those conditions are no longer saved. Start the plan again." };
  const skis = await loadSkis(supabase);
  const ski = skis.find((k) => k.id === choice.skiId) ?? null;
  const planChoice: PlanChoice = {
    technique: choice.technique === "classic" ? "classic" : "skate",
    gripType: (choice.gripType as PlanChoice["gripType"]) ?? null,
    mode: choice.mode === "race" ? "race" : "recreational",
    family: choice.family || "any",
    ski,
  };
  const { req, result } = await buildRecommendation(supabase, conditions, planChoice);

  const { data: rec, error: recError } = await supabase
    .from("recommendations")
    .insert({
      user_id: auth.user.id,
      ski_id: ski?.id ?? null,
      conditions_id: conditions.id,
      technique: req.technique,
      mode: req.mode,
      layers: result.layers.map((l) => ({
        layer_role: l.role,
        zone: l.zone,
        product_id: l.pick?.product.id ?? null,
        user_product_id: l.pick?.product.user_product_id ?? null,
        fit: l.pick?.fit ?? null,
        reason: l.pick?.reasons.join("; ") ?? null,
        market: l.market.map((m) => m.product.id),
      })),
      procedure_steps: result.procedure.flatMap((s) => s.steps.map((st, i) => ({ section: s.title, step: i + 1, text: st.text }))),
      inventory_gaps: result.gaps,
    })
    .select("id")
    .single();
  if (recError) return { error: `Could not save the plan: ${recError.message}` };

  const layers = result.layers
    .filter((l) => l.role !== "cleaning")
    .map((l) => ({
      zone: l.zone,
      layer_role: l.role,
      user_product_id: l.pick?.product.user_product_id ?? null,
      // A gap is kept as a named step, so the session shows what to buy or borrow.
      custom_product: l.pick ? null : `${ROLE_TEXT[l.role] ?? l.role}: ${CATEGORY_TEXT[l.categories[0]] ?? l.categories[0]} (not in box)`,
      method:
        l.zone === "grip"
          ? l.role === "kick" || l.role === "cover" ? "cork" : l.role === "skin_care" ? "spray" : "iron"
          : l.pick?.product.form === "liquid" || l.role === "top_coat" ? "liquid" : "iron",
      iron_temp_c: l.pick?.product.iron_temp_c ?? null,
    }));

  const { data: sessionId, error } = await supabase.rpc("save_wax_session", {
    p_id: null,
    p_session: {
      occurred_at: conditions.observed_at,
      status: "planned",
      technique: req.technique,
      ski_id: ski?.id ?? null,
      mode: req.mode,
      venue_id: conditions.venue_id,
      forecast_conditions_id: conditions.id,
      recommendation_id: rec.id,
      finish_notes: result.procedure.map((s) => `${s.title}:\n${s.steps.map((st, i) => `${i + 1}. ${st.text}`).join("\n")}`).join("\n\n"),
    },
    p_actual: null,
    p_layers: layers,
  });
  if (error) return { error: `Saved the plan, but not the session: ${error.message}` };
  // No pair chosen: the session is for whoever the plan was for. (A pair's
  // owner is filled in by the database.) The foreign key refuses anyone else's skier.
  if (!ski && /^[0-9a-f-]{36}$/i.test(choice.owner)) {
    await supabase.from("wax_sessions").update({ skier_id: choice.owner }).eq("id", sessionId as string);
  }
  revalidatePath("/history");
  redirect(`/history/${sessionId as string}?saved=1`);
}
