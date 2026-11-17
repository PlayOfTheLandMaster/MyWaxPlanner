import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadSkiers, type Skier } from "./load";
import { displayName } from "@/lib/profile/name";
import { readStyle, type WaxingStyle } from "@/lib/profile/style";
import { seasonStart } from "@/lib/history/filters";

// The skier being waxed for, picked on Today. Other screens start with that
// skier chosen; each can still look at someone else for the moment.

export type SkierContext = {
  /** The account's skiers, A–Z. Empty means the account only waxes its own skis. */
  skiers: Skier[];
  /** The picked skier, or null for the account holder ("Me"). */
  current: Skier | null;
  /** "me" or the skier's id, the value filters and pull-downs use. */
  key: string;
  /** The account holder's own name ("Finn P."), shown where the app once said "Me". */
  me: string;
  /** How the account holder waxes; null when not chosen yet (treated as guided). */
  style: WaxingStyle | null;
  /** The month (1–12) the account's ski season starts in; a season runs 12 months from it. */
  seasonStart: number;
};

/** Read once per request, however many parts of the page ask. */
export const loadSkierContext = cache(async (): Promise<SkierContext> => {
  const supabase = await createClient();
  const [skiers, profile] = await Promise.all([
    loadSkiers(supabase),
    supabase.from("profiles").select("current_skier_id, first_name, last_initial, waxing_style, season_start_month").maybeSingle(),
  ]);
  const id = (profile.data?.current_skier_id as string | null) ?? null;
  const current = skiers.find((k) => k.id === id) ?? null;
  const me = displayName(profile.data?.first_name as string | null, profile.data?.last_initial as string | null);
  return { skiers, current, key: current?.id ?? "me", me, style: readStyle(profile.data?.waxing_style), seasonStart: seasonStart(profile.data?.season_start_month) };
});

/**
 * A new session with no skis chosen has no pair to say whose it is; it is
 * for the current skier. (With skis, the database takes the pair's owner.)
 */
export async function claimForCurrentSkier(supabase: SupabaseClient, sessionId: string) {
  const { current } = await loadSkierContext();
  if (!current) return;
  await supabase.from("wax_sessions").update({ skier_id: current.id }).eq("id", sessionId).is("ski_id", null);
}
