"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { claimForCurrentSkier } from "@/lib/skiers/current";
import { readSession } from "@/lib/history/input";
import { afterRating, readRating } from "@/lib/history/rate";

export type SessionFormState = { error?: string };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

/** Create (id null) or replace a session, with its conditions and layers, in one transaction. */
export async function saveSession(
  id: string | null,
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const { supabase } = await signedIn();
  const { payload, error } = readSession(formData);
  if (error !== undefined) return { error };

  const { data, error: saveError } = await supabase.rpc("save_wax_session", {
    p_id: id,
    p_session: payload.session,
    p_actual: payload.actual,
    p_layers: payload.layers,
  });
  if (saveError) {
    if (saveError.code === "P0002") return { error: "That session is no longer in your history." };
    return { error: `Could not save the session: ${saveError.message}` };
  }
  // A new session with no skis is for the skier picked on Today.
  if (!id) await claimForCurrentSkier(supabase, data as string);
  revalidatePath("/history");
  // A session still to be rated belongs to the Session tab; a finished one to History.
  const where = payload.session.status === "planned" ? "session" : "history";
  redirect(`/${where}/${data as string}${id ? "" : "?saved=1"}`);
}

/**
 * The short "How did it go?" card. Saves the ratings and notes and marks the
 * session done. "Snow was as forecast" turns the forecast into the session's
 * actual conditions (only when none are recorded yet, so nothing is
 * overwritten). "I changed something" or "the snow was different" leads on to
 * the full form to correct the layers or the conditions.
 */
export async function rateSession(id: string, _prev: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const { supabase, userId } = await signedIn();
  const { data: s, error: readError } = await supabase
    .from("wax_sessions")
    .select("id, technique, occurred_at, venue_id, forecast_conditions_id, actual_conditions_id")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { error: `Could not read the session: ${readError.message}` };
  if (!s) return { error: "That session is no longer in your history." };

  const { rating, error } = readRating(formData, s.technique === "classic");
  if (error !== undefined) return { error };

  let actualId = s.actual_conditions_id as string | null;
  if (rating.snow === "forecast" && s.forecast_conditions_id && !actualId) {
    const { data: f } = await supabase
      .from("conditions")
      .select("venue_id, air_temp_c, snow_temp_c, snow_temp_estimated, air_rh_pct, snow_humidity_band, snow_type, new_snow_cm, sky, wind_kmh, track")
      .eq("id", s.forecast_conditions_id)
      .maybeSingle();
    if (f) {
      const { data: copy, error: copyError } = await supabase
        .from("conditions")
        .insert({ ...f, user_id: userId, venue_id: f.venue_id ?? s.venue_id, observed_at: s.occurred_at, source: "observed" })
        .select("id")
        .single();
      if (copyError) return { error: `Could not save the conditions: ${copyError.message}` };
      actualId = copy.id as string;
    }
  }

  const { error: saveError } = await supabase
    .from("wax_sessions")
    .update({
      glide_rating: rating.glide_rating,
      grip_rating: rating.grip_rating,
      kick_feel: rating.kick_feel,
      notes: rating.notes,
      actual_conditions_id: actualId,
      status: "completed",
    })
    .eq("id", id);
  if (saveError) return { error: `Could not save the ratings: ${saveError.message}` };

  revalidatePath("/history");
  revalidatePath("/");
  redirect(afterRating(id, rating));
}

/** Layers and photo records go with it (on delete cascade); the photo files are removed too. */
/** Deletes a session; `back` is where to land (History by default, or the Session tab's list). */
export async function deleteSession(id: string, back: "/history" | "/plan" = "/history") {
  const { supabase } = await signedIn();
  const { data: photos } = await supabase.from("wax_session_photos").select("storage_path").eq("session_id", id);
  const { data: session } = await supabase
    .from("wax_sessions")
    .select("actual_conditions_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("wax_sessions").delete().eq("id", id);
  // Observed conditions belong to this session alone.
  if (session?.actual_conditions_id) await supabase.from("conditions").delete().eq("id", session.actual_conditions_id);
  if (photos?.length) await supabase.storage.from("session-photos").remove(photos.map((p) => p.storage_path));
  revalidatePath("/history");
  revalidatePath("/plan");
  redirect(back === "/plan" ? "/plan" : "/history");
}

export async function deletePhoto(sessionId: string, photoId: string) {
  const { supabase } = await signedIn();
  const { data } = await supabase
    .from("wax_session_photos")
    .delete()
    .eq("id", photoId)
    .select("storage_path")
    .maybeSingle();
  if (data?.storage_path) await supabase.storage.from("session-photos").remove([data.storage_path]);
  revalidatePath(`/history/${sessionId}`);
}

export type FilterFormState = { error?: string; saved?: string };

export async function saveFilter(query: string, _prev: FilterFormState, formData: FormData): Promise<FilterFormState> {
  const { supabase, userId } = await signedIn();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { error: "Give the filter a name." };
  if (name.length > 80) return { error: "Keep the name under 80 characters." };
  const q = query.replace(/^\?/, "");
  const { error } = await supabase
    .from("saved_filters")
    .upsert({ user_id: userId, name, query: q }, { onConflict: "user_id,name" });
  if (error) return { error: `Could not save the filter: ${error.message}` };
  revalidatePath("/history");
  return { saved: name };
}

export async function deleteFilter(id: string) {
  const { supabase } = await signedIn();
  await supabase.from("saved_filters").delete().eq("id", id);
  revalidatePath("/history");
}
