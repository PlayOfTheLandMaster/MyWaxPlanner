"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dayIn } from "@/lib/venues/today";
import { readerTimeZone } from "@/lib/reader-zone";

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

/** Sessions and conditions at this venue keep their data; they just stop naming it. */
export async function deleteVenue(id: string) {
  const { supabase } = await signedIn();
  await supabase.from("venues").delete().eq("id", id);
  revalidatePath("/venues");
  // Today's location list offers Delete too.
  revalidatePath("/");
}

export async function setHomeVenue(id: string | null) {
  const { supabase, userId } = await signedIn();
  await supabase.from("profiles").update({ home_venue_id: id }).eq("id", userId);
  revalidatePath("/venues");
  revalidatePath("/");
}
