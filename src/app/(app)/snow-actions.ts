"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readSnowForm } from "@/lib/snow/check";

export type SnowCheckState = { error?: string; saved?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves Today's Snow Conditions for this venue and day. */
export async function saveSnowCheck(_prev: SnowCheckState, form: FormData): Promise<SnowCheckState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const venue_id = String(form.get("venue_id") ?? "");
  const day = String(form.get("day") ?? "");
  if (!UUID.test(venue_id) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Reload the page and try again." };
  const r = readSnowForm(form, { venue_id, day }, new Date());
  if ("error" in r) return { error: r.error };
  const { error } = await supabase.from("profiles").update({ snow_check: r.check }).eq("id", data.user.id);
  if (error) return { error: `Could not save: ${error.message}` };
  revalidatePath("/");
  revalidatePath("/plan");
  return { saved: true };
}
