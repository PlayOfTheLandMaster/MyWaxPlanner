"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readBody, type Body } from "@/lib/skiers/body";
import { displayName, readName } from "@/lib/profile/name";

export type SkierFormState = { error?: string; added?: string };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

function read(form: FormData): ({ name: string; notes: string | null } & Body) | { error: string } {
  // Saved as one name, "Anna S.", so every screen that names a skier shows the initial.
  const parts = readName(form);
  if ("error" in parts) return { error: parts.error.replace("your", "the skier's") };
  const name = displayName(parts.first_name, parts.last_initial);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 500) || null;
  const body = readBody(form);
  if ("error" in body) return body;
  return { name, notes, ...body };
}

export async function addSkier(_prev: SkierFormState, form: FormData): Promise<SkierFormState> {
  const { supabase, userId } = await signedIn();
  const r = read(form);
  if ("error" in r) return { error: r.error };
  const { error } = await supabase.from("skiers").insert({ user_id: userId, ...r });
  if (error) return { error: error.code === "23505" ? `You already have a skier called ${r.name}.` : `Could not add: ${error.message}` };
  revalidatePath("/account");
  return { added: r.name };
}

export async function updateSkier(id: string, _prev: SkierFormState, form: FormData): Promise<SkierFormState> {
  const { supabase } = await signedIn();
  const r = read(form);
  if ("error" in r) return { error: r.error };
  const { error } = await supabase.from("skiers").update(r).eq("id", id);
  if (error) return { error: error.code === "23505" ? `You already have a skier called ${r.name}.` : `Could not save: ${error.message}` };
  revalidatePath("/account");
  redirect("/account");
}

/** Their skis and sessions stay, as yours. */
export async function deleteSkier(id: string) {
  const { supabase } = await signedIn();
  await supabase.from("skiers").delete().eq("id", id);
  revalidatePath("/account");
  redirect("/account");
}
