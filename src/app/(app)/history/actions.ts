"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/history/input";

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
  revalidatePath("/history");
  redirect(`/history/${data as string}${id ? "" : "?saved=1"}`);
}

/** Layers and photo records go with it (on delete cascade); the photo files are removed too. */
export async function deleteSession(id: string) {
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
  redirect("/history");
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
