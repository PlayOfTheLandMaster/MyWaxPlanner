import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Whether the signed-in user may edit the Learn library (a row in app_admins). */
export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.from("app_admins").select("user_id").maybeSingle();
  return !!data;
}

export const VIDEO_COLUMNS = "id, youtube_id, title, channel, topic, technique, level, start_seconds, notes, tags";
