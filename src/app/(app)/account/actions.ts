"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readBody } from "@/lib/skiers/body";
import { readName } from "@/lib/profile/name";
import { readStyle, type WaxingStyle } from "@/lib/profile/style";

export type SettingsState = { error?: string; saved?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const home = String(form.get("home_venue_id") ?? "");
  const mode = form.get("default_mode") === "race" ? "race" : "recreational";
  const name = readName(form);
  if ("error" in name) return { error: name.error };
  const body = readBody(form);
  if ("error" in body) return { error: body.error };
  const { error } = await supabase
    .from("profiles")
    .update({ home_venue_id: UUID.test(home) ? home : null, default_mode: mode, ...name, ...body })
    .eq("id", data.user.id);
  if (error) return { error: `Could not save: ${error.message}` };
  revalidatePath("/");
  revalidatePath("/account");
  return { saved: true };
}

/** "How you wax": guided or expert. One tap, saved at once. */
export async function setWaxingStyle(style: WaxingStyle) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  if (!readStyle(style)) return;
  await supabase.from("profiles").update({ waxing_style: style }).eq("id", data.user.id);
  revalidatePath("/");
  revalidatePath("/account");
}
