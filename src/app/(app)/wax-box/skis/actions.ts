"use server";

import { redirect } from "next/navigation";
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

/** Waxing sessions on these skis are kept; they just no longer name a pair. */
export async function deleteSki(id: string) {
  const { supabase } = await signedIn();
  await supabase.from("skis").delete().eq("id", id);
  redirect("/wax-box/skis");
}
