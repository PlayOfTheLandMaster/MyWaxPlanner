import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** A person whose skis this account waxes. No skier (null) means the account holder. */
export type Skier = { id: string; name: string; notes: string | null };

export const ME = "Me";

export async function loadSkiers(supabase: SupabaseClient): Promise<Skier[]> {
  const { data, error } = await supabase.from("skiers").select("id, name, notes").order("name");
  if (error) throw new Error(`Could not read your skiers: ${error.message}`);
  return (data ?? []) as Skier[];
}
