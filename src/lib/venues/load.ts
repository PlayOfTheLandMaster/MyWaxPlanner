import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VenueRow = {
  id: string;
  user_id: string | null;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation_m: number | null;
  /** A shared venue this account removed from its lists (profiles.hidden_venues). */
  hidden: boolean;
};

/** The shared venues this account has hidden. */
export async function loadHiddenVenueIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await supabase.from("profiles").select("hidden_venues").maybeSingle();
  return new Set(((data?.hidden_venues as string[] | null) ?? []).map(String));
}

/**
 * Your venues and the shared ones, yours first. Row Level Security picks
 * them; hidden shared ones are left out unless `includeHidden` (the Venues
 * page, which offers "Show again").
 */
export async function loadVenues(supabase: SupabaseClient, { includeHidden = false } = {}): Promise<VenueRow[]> {
  const [{ data, error }, hidden] = await Promise.all([
    supabase.from("venues").select("id, user_id, name, region, latitude, longitude, elevation_m").order("name"),
    loadHiddenVenueIds(supabase),
  ]);
  if (error) throw new Error(`Could not read the venues: ${error.message}`);
  const rows = ((data ?? []) as Omit<VenueRow, "hidden">[])
    .map((v) => ({ ...v, hidden: !v.user_id && hidden.has(v.id) }))
    .filter((v) => includeHidden || !v.hidden);
  return [...rows.filter((v) => v.user_id), ...rows.filter((v) => !v.user_id)];
}

/** How many sessions name each of these venues (your own sessions only, by RLS). */
export async function countSessionsAt(supabase: SupabaseClient, venueIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!venueIds.length) return counts;
  const { data } = await supabase.from("wax_sessions").select("venue_id").in("venue_id", venueIds);
  for (const r of data ?? []) counts.set(r.venue_id as string, (counts.get(r.venue_id as string) ?? 0) + 1);
  return counts;
}

export async function loadHomeVenueId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("home_venue_id").maybeSingle();
  return (data?.home_venue_id as string | null) ?? null;
}

/** A venue the forecast can use: it has a position. */
export function forecastable(v: VenueRow): v is VenueRow & { latitude: number; longitude: number } {
  return v.latitude !== null && v.longitude !== null;
}
