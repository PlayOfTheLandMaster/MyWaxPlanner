// "Record today's wax", the expert's main button: the full form, set to now,
// with the venue's forecast saved alongside so History and "Similar to today"
// still have conditions to work with. Pure, so it can be tested.

import type { ForecastWindow } from "@/lib/weather/forecast";
import type { DraftConditions } from "@/lib/plan/draft";

/** The forecast as the conditions a plan would save, untouched by the skier. */
export function draftFromWindow(w: ForecastWindow): DraftConditions {
  return {
    venue_id: w.venue.id,
    observed_at: w.startIso,
    air_temp_c: w.air_temp_c,
    air_temp_min_c: w.air_temp_min_c,
    air_temp_max_c: w.air_temp_max_c,
    overnight_low_c: w.overnight_low_c,
    snow_temp_c: Math.min(0, w.snow_temp_c),
    snow_temp_estimated: true,
    air_rh_pct: Math.round(w.air_rh_pct),
    snow_humidity_band: w.snow_humidity_band,
    snow_type: w.snow_type,
    new_snow_cm: w.new_snow_cm,
    sky: w.sky,
    wind_kmh: w.wind_kmh,
    track: null,
    notes: `${w.start.slice(0, 16)} local, ${w.hours.length} h`,
  };
}

export type PastSession = {
  id: string;
  occurred_at: string;
  venue_name: string | null;
  snow_temp_c: number | null;
  snow_humidity_band: string | null;
  glide_rating: number | null;
};

/**
 * "Start from…": past sessions in snow like today's (within 3 °C, same
 * humidity), best glide first. Empty with no forecast to compare against.
 */
export function similarSessions(
  past: PastSession[],
  today: { snow_temp_c: number; snow_humidity_band: string } | null,
  limit = 3,
): PastSession[] {
  if (!today) return [];
  return past
    .filter(
      (s) =>
        s.snow_temp_c !== null &&
        Math.abs(Number(s.snow_temp_c) - today.snow_temp_c) <= 3 &&
        s.snow_humidity_band === today.snow_humidity_band,
    )
    .sort((a, b) => (b.glide_rating ?? 0) - (a.glide_rating ?? 0) || b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, limit);
}
