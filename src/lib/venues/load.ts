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
};

/** Your venues and the shared ones, yours first. Row Level Security picks them. */
export async function loadVenues(supabase: SupabaseClient): Promise<VenueRow[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("id, user_id, name, region, latitude, longitude, elevation_m")
    .order("name");
  if (error) throw new Error(`Could not read the venues: ${error.message}`);
  const rows = (data ?? []) as VenueRow[];
  return [...rows.filter((v) => v.user_id), ...rows.filter((v) => !v.user_id)];
}

export async function loadHomeVenueId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("home_venue_id").maybeSingle();
  return (data?.home_venue_id as string | null) ?? null;
}

/** A venue the forecast can use: it has a position. */
export function forecastable(v: VenueRow): v is VenueRow & { latitude: number; longitude: number } {
  return v.latitude !== null && v.longitude !== null;
}
