"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The session page's own changes while a session is under way: ticking the
// plan's steps, finishing the wax, and swapping or skipping a layer. Row
// Level Security limits every one of them to the session's owner.

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return supabase;
}

/** Ticks or unticks one of the plan's steps (its 0-based position). Returns an error message, or null. */
export async function setWaxStep(sessionId: string, step: number, done: boolean): Promise<string | null> {
  const supabase = await signedIn();
  if (!Number.isInteger(step) || step < 0 || step > 199) return "That step is not part of the plan.";
  const { data, error } = await supabase.from("wax_sessions").select("wax_steps_done").eq("id", sessionId).maybeSingle();
  if (error || !data) return "That session is no longer in your history.";
  const current = new Set<number>((data.wax_steps_done ?? []).map(Number));
  if (done) current.add(step);
  else current.delete(step);
  const { error: saveError } = await supabase
    .from("wax_sessions")
    .update({ wax_steps_done: [...current].sort((a, b) => a - b) })
    .eq("id", sessionId);
  if (saveError) return `Could not save the tick: ${saveError.message}`;
  return null;
}

/**
 * Wax-along's ticks: the whole list, not one step. The screen saves in order,
 * always sending its latest list, so quick taps cannot overwrite each other
 * the way two read-then-write saves of single steps would.
 */
export async function setWaxSteps(sessionId: string, steps: number[]): Promise<string | null> {
  const supabase = await signedIn();
  if (!Array.isArray(steps) || steps.some((n) => !Number.isInteger(n) || n < 0 || n > 199)) return "That step is not part of the plan.";
  const list = [...new Set(steps)].sort((a, b) => a - b);
  const { data, error } = await supabase.from("wax_sessions").update({ wax_steps_done: list }).eq("id", sessionId).select("id");
  if (error) return `Could not save the tick: ${error.message}`;
  if (!data?.length) return "That session is no longer in your history.";
  return null;
}

/** "I'm Done Waxing": the session is ready to ski. */
export async function finishWaxing(sessionId: string) {
  const supabase = await signedIn();
  await supabase.from("wax_sessions").update({ waxed_at: new Date().toISOString() }).eq("id", sessionId);
  revalidatePath("/plan");
  redirect(`/session/${sessionId}?saved=waxed`);
}

/** "Done": skied, rating later. The session moves to Unrated sessions on the Session tab. */
export async function markDone(sessionId: string, from: "session" | "list" = "session") {
  const supabase = await signedIn();
  await supabase.from("wax_sessions").update({ done_at: new Date().toISOString() }).eq("id", sessionId);
  revalidatePath("/plan");
  // From the Session tab's list, stay on it: a coach marks a dozen in a row.
  if (from === "list") refresh();
  else redirect(`/session/${sessionId}?saved=done`);
}

/** Undoes "Done", for a tap made too early. */
export async function unmarkDone(sessionId: string) {
  const supabase = await signedIn();
  await supabase.from("wax_sessions").update({ done_at: null }).eq("id", sessionId);
  revalidatePath("/plan");
  refresh();
}

/** Undoes "I'm Done Waxing", for a tap made too early. */
export async function unfinishWaxing(sessionId: string) {
  const supabase = await signedIn();
  await supabase.from("wax_sessions").update({ waxed_at: null }).eq("id", sessionId);
  refresh();
}

/**
 * Swaps a layer's wax for another from the box, or skips the layer. The plan
 * itself is kept in the session's recommendation, so the page can still show
 * what was planned beside what was used.
 */
export async function changeLayer(sessionId: string, layerId: string, formData: FormData) {
  const supabase = await signedIn();
  const choice = String(formData.get("wax") ?? "");
  if (choice === "skip") {
    await supabase.from("wax_session_layers").delete().eq("id", layerId).eq("session_id", sessionId);
  } else if (/^[0-9a-f-]{36}$/i.test(choice)) {
    // product_id follows the box row, as save_wax_session() does, so the
    // history still names the wax after it has left the box.
    const { data: boxRow } = await supabase.from("user_products").select("product_id").eq("id", choice).maybeSingle();
    if (boxRow) {
      await supabase
        .from("wax_session_layers")
        .update({ user_product_id: choice, product_id: boxRow.product_id, custom_product: null })
        .eq("id", layerId)
        .eq("session_id", sessionId);
    }
  }
  refresh();
}
