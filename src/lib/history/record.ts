// "Record today's wax", the expert's main button: the full form, set to now,
// with the venue's forecast saved alongside so History and "Similar to today"
// still have conditions to work with. Pure, so it can be tested.

import type { ForecastWindow } from "@/lib/weather/forecast";
import type { DraftConditions } from "@/lib/plan/draft";
import type { SnowCheck } from "@/lib/snow/check";

/**
 * The forecast as the conditions a plan would save. With Today's Snow
 * Conditions for the same venue and day, the skier's own check replaces the
 * forecast's snow guesses.
 */
export function draftFromWindow(w: ForecastWindow, check: SnowCheck | null = null): DraftConditions {
  const base: DraftConditions = {
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
  if (!check || check.venue_id !== w.venue.id || check.day !== w.start.slice(0, 10)) return base;
  return {
    ...base,
    snow_temp_c: check.snow_temp_c,
    snow_temp_estimated: false,
    snow_humidity_band: check.snow_humidity_band,
    snow_type: check.snow_type,
    track: check.track,
  };
}
