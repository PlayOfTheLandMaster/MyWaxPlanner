"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readSnowForm } from "@/lib/snow/check";
import { dayIn } from "@/lib/venues/today";
import { readerTimeZone } from "@/lib/reader-zone";

export type SnowCheckState = { error?: string; saved?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves Today's Skiing Conditions for this venue and day. */
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

/**
 * Clears Today's Skiing Conditions, so the card goes back to the forecast's
 * estimate. Wax jobs already saved keep the conditions they were saved with.
 */
export async function clearSnowCheck(): Promise<SnowCheckState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { error } = await supabase.from("profiles").update({ snow_check: null }).eq("id", data.user.id);
  if (error) return { error: `Could not clear: ${error.message}` };
  revalidatePath("/");
  revalidatePath("/plan");
  return {};
}

/**
 * Sets today's location: every wax job for the rest of the reader's day uses
 * it (Today, Plan a wax session, Record a wax job). "home" goes back to the home venue.
 */
export async function setTodayVenue(venueId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const day = dayIn(new Date(), await readerTimeZone());
  let current: { venue_id: string; day: string } | null = null;
  if (venueId !== "home") {
    if (!UUID.test(venueId)) return;
    // Only a venue this account can see (its own or a shared one).
    const { data: v } = await supabase.from("venues").select("id").eq("id", venueId).maybeSingle();
    if (!v) return;
    current = { venue_id: venueId, day };
  }
  await supabase.from("profiles").update({ current_venue: current }).eq("id", data.user.id);
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/history");
}
