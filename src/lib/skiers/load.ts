import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Body } from "./body";

/** A person whose skis this account waxes. No skier (null) means the account holder. */
export type Skier = { id: string; name: string; notes: string | null } & Body;

export const ME = "Me";

export async function loadSkiers(supabase: SupabaseClient): Promise<Skier[]> {
  const { data, error } = await supabase.from("skiers").select("id, name, notes, birth_year, birth_month, weight_kg").order("name");
  if (error) throw new Error(`Could not read your skiers: ${error.message}`);
  return (data ?? []) as Skier[];
}
