import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSnowCheck, type SnowCheck } from "./check";

/** The account's last snow check, whatever day it was for. */
export async function loadSnowCheck(supabase: SupabaseClient): Promise<SnowCheck | null> {
  const { data } = await supabase.from("profiles").select("snow_check").maybeSingle();
  return readSnowCheck(data?.snow_check);
}
