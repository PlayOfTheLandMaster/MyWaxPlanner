"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readSki } from "@/lib/skis/input";

export type SkiFormState = { error?: string };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function createSki(_prev: SkiFormState, formData: FormData): Promise<SkiFormState> {
  const { supabase, userId } = await signedIn();
  const { ski, error } = readSki(formData);
  if (error !== undefined) return { error };
  const { error: saveError } = await supabase.from("skis").insert({ ...ski, user_id: userId });
  if (saveError) return { error: `Could not save the skis: ${saveError.message}` };
  redirect("/wax-box/skis");
}

export async function updateSki(id: string, _prev: SkiFormState, formData: FormData): Promise<SkiFormState> {
  const { supabase } = await signedIn();
  const { ski, error } = readSki(formData);
  if (error !== undefined) return { error };
  // RLS limits the update to the user's own skis; zero rows means it is not theirs or is gone.
  const { data, error: saveError } = await supabase.from("skis").update(ski).eq("id", id).select("id");
  if (saveError) return { error: `Could not save the skis: ${saveError.message}` };
  if (!data?.length) return { error: "These skis are no longer in your list." };
  redirect("/wax-box/skis");
}

/**
 * Waxing sessions on these skis are kept; they just no longer name a pair.
 * From the list it stays on the list as it was (owner filter included);
 * from the edit page, whose pair is gone, it goes back to the list.
 */
export async function deleteSki(id: string, from: "edit" | "list" = "edit") {
  const { supabase } = await signedIn();
  await supabase.from("skis").delete().eq("id", id);
  if (from === "list") refresh();
  else redirect("/wax-box/skis");
}

export type AddedSki = {
  ski?: { id: string; name: string; technique: "classic" | "skate"; category: string | null; skier_id: string | null; grind: string | null; grip_zone_cm: number | null };
  error?: string;
};

/**
 * Adds a pair from inside a wax job or a plan (Add a pair of skis…), for the
 * person those skis are for, and returns it so the picker can select it
 * without leaving the page. The same rules as the full form (readSki); Row
 * Level Security keeps the pair, and the skier it names, to this account.
 */
export async function quickAddSki(owner: string | null, formData: FormData): Promise<AddedSki> {
  const { supabase, userId } = await signedIn();
  if (owner !== null) formData.set("skier_id", owner);
  else formData.delete("skier_id");
  const { ski, error } = readSki(formData);
  if (error !== undefined) return { error };
  const { data, error: saveError } = await supabase
    .from("skis")
    .insert({ ...ski, user_id: userId })
    .select("id, name, technique, category, skier_id, grind, grip_zone_cm")
    .single();
  if (saveError) return { error: `Could not save the skis: ${saveError.message}` };
  return { ski: data as AddedSki["ski"] };
}
