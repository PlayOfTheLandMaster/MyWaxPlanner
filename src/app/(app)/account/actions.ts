"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; saved?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const home = String(form.get("home_venue_id") ?? "");
  const mode = form.get("default_mode") === "race" ? "race" : "recreational";
  const displayName = String(form.get("display_name") ?? "").trim().slice(0, 60) || null;
  const { error } = await supabase
    .from("profiles")
    .update({ home_venue_id: UUID.test(home) ? home : null, default_mode: mode, display_name: displayName })
    .eq("id", data.user.id);
  if (error) return { error: `Could not save: ${error.message}` };
  revalidatePath("/");
  return { saved: true };
}
