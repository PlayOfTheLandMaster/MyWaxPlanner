"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dayIn } from "@/lib/venues/today";
import { readerTimeZone } from "@/lib/reader-zone";
import { isAdmin } from "@/lib/learn/load";

export type VenueFormState = { error?: string };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

const num = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim().replace(",", ".").replace("−", "-") : "";
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export async function addVenue(_prev: VenueFormState, formData: FormData): Promise<VenueFormState> {
  const { supabase, userId } = await signedIn();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const region = String(formData.get("region") ?? "").trim() || null;
  const latitude = num(formData.get("latitude"));
  const longitude = num(formData.get("longitude"));
  const elevation = num(formData.get("elevation_m"));
  if (!name) return { error: "Give the venue a name." };
  if (latitude === null || longitude === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { error: "The venue needs a position: search for it, use your location, or type its latitude and longitude." };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: "Latitude is −90 to 90 and longitude −180 to 180 (Calgary is about 51, −114)." };
  }
  if (Number.isNaN(elevation) || (elevation !== null && (elevation < -500 || elevation > 6000))) {
    return { error: "Elevation is in metres, for example 1540." };
  }
  const { data, error } = await supabase
    .from("venues")
    .insert({
      user_id: userId,
      name,
      region,
      latitude: Math.round(latitude * 1e5) / 1e5,
      longitude: Math.round(longitude * 1e5) / 1e5,
      elevation_m: elevation === null ? null : Math.round(elevation),
    })
    .select("id")
    .single();
  if (error) return { error: `Could not save the venue: ${error.message}` };
  if (formData.get("make_home") === "on") {
    await supabase.from("profiles").update({ home_venue_id: data.id }).eq("id", userId);
  }
  revalidatePath("/venues");
  const back = String(formData.get("back") ?? "");
  if (back === "/") {
    // Added from Today's Set location: it becomes today's location straight away.
    const day = dayIn(new Date(), await readerTimeZone());
    await supabase.from("profiles").update({ current_venue: { venue_id: data.id, day } }).eq("id", userId);
    revalidatePath("/");
    redirect("/");
  }
  redirect(back.startsWith("/plan") ? `/plan?venue=${data.id}` : "/venues");
}

function revalidateVenues() {
  for (const p of ["/", "/venues", "/plan", "/history"]) revalidatePath(p);
}

/** Sessions and conditions at this venue keep their data; they just stop naming it. */
export async function deleteVenue(id: string) {
  const { supabase } = await signedIn();
  // A delete that Row Level Security refuses is not an error, only zero rows,
  // so count what went: the admin's Delete once "did nothing" with no word why.
  const { data: gone, error } = await supabase.from("venues").delete().eq("id", id).select("id");
  if (error || !gone?.length) redirect("/venues?notdeleted=1");
  revalidateVenues();
  refresh();
}

/** If home or today's location is `from`, point it at `to` (null: clear it). */
async function repoint(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, from: string, to: string | null) {
  const { data } = await supabase.from("profiles").select("home_venue_id, current_venue").eq("id", userId).maybeSingle();
  const patch: Record<string, unknown> = {};
  if (data?.home_venue_id === from) patch.home_venue_id = to;
  const cur = data?.current_venue as { venue_id?: string; day?: string } | null;
  if (cur?.venue_id === from) patch.current_venue = to ? { ...cur, venue_id: to } : null;
  if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", userId);
}

/**
 * ✕ on one of your own locations. `target` says what happens to the sessions
 * that name it: a venue id moves them (and their conditions) there first;
 * "keep" keeps the old name on each session as plain text; "none" is for a
 * location with no sessions. Then the venue is deleted.
 */
export async function removeVenue(id: string, target: string) {
  const { supabase, userId } = await signedIn();
  const { data: venue } = await supabase.from("venues").select("id, user_id, name").eq("id", id).maybeSingle();
  if (!venue) return;
  // Shared venues are hidden, not deleted, except by the admin (who added them).
  if (venue.user_id !== userId && !(venue.user_id === null && (await isAdmin(supabase)))) return;

  if (target !== "keep" && target !== "none") {
    if (target === id) return;
    const { data: to } = await supabase.from("venues").select("id").eq("id", target).maybeSingle();
    if (!to) return; // not a venue this account can see
    const moved = await supabase.from("wax_sessions").update({ venue_id: target }).eq("venue_id", id);
    if (moved.error) throw new Error(`Could not move the sessions: ${moved.error.message}`);
    await supabase.from("conditions").update({ venue_id: target }).eq("venue_id", id);
    await repoint(supabase, userId, id, target);
  } else if (target === "keep") {
    const kept = await supabase.from("wax_sessions").update({ venue_label: venue.name }).eq("venue_id", id);
    if (kept.error) throw new Error(`Could not keep the name on the sessions: ${kept.error.message}`);
  }
  await supabase.from("venues").delete().eq("id", id);
  revalidateVenues();
}

/** ✕ on a shared location: off this account's lists, for this account only. */
export async function hideVenue(id: string) {
  const { supabase, userId } = await signedIn();
  const { data: venue } = await supabase.from("venues").select("id, user_id").eq("id", id).maybeSingle();
  if (!venue || venue.user_id !== null) return;
  const { data } = await supabase.from("profiles").select("hidden_venues").eq("id", userId).maybeSingle();
  const hidden = new Set(((data?.hidden_venues as string[] | null) ?? []).map(String));
  hidden.add(id);
  await supabase.from("profiles").update({ hidden_venues: [...hidden] }).eq("id", userId);
  await repoint(supabase, userId, id, null);
  revalidateVenues();
}

export async function unhideVenue(id: string) {
  const { supabase, userId } = await signedIn();
  const { data } = await supabase.from("profiles").select("hidden_venues").eq("id", userId).maybeSingle();
  const hidden = ((data?.hidden_venues as string[] | null) ?? []).map(String).filter((v) => v !== id);
  await supabase.from("profiles").update({ hidden_venues: hidden }).eq("id", userId);
  revalidateVenues();
}

export async function setHomeVenue(id: string | null) {
  const { supabase, userId } = await signedIn();
  await supabase.from("profiles").update({ home_venue_id: id }).eq("id", userId);
  revalidatePath("/venues");
  revalidatePath("/");
}
