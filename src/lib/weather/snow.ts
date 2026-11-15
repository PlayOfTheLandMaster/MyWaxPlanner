// Turning an air forecast into the snow conditions waxing depends on. Every
// result here is an estimate the skier can override: forecasts give air, not
// snow, and the snowball test and a snow thermometer beat any formula.

import type { HumidityBand, SnowType } from "@/lib/catalogue/vocab";

export type Hour = {
  time: string; // venue-local, "2026-11-15T11:00"
  temp_c: number;
  rh_pct: number;
  snowfall_cm: number;
  rain_mm: number;
  cloud_pct: number;
  wind_kmh: number;
  weather_code: number;
  is_day: boolean;
};

/** Air humidity bands from the spec: dry (<50 %), medium (50–80 %), humid (>80 %). */
export function airHumidityBand(rh: number): HumidityBand {
  if (rh < 50) return "dry";
  if (rh <= 80) return "mid";
  return "wet";
}

/**
 * Snow surface temperature for an hour on the trail.
 *
 * Snow cannot be warmer than 0 °C. Below that it lags the air: a hard
 * overnight frost keeps the snow colder than a mild morning's air, so the
 * estimate leans a little towards the overnight low. Under a clear sky the
 * surface also radiates heat away and runs a few degrees under the air,
 * most of all early, late and at night; cloud acts as a lid.
 */
export function estimateSnowTemp(hour: Pick<Hour, "temp_c" | "cloud_pct" | "is_day" | "time">, overnightLow: number | null): number {
  if (hour.temp_c >= 1) return 0;
  const lagged = overnightLow === null ? hour.temp_c : 0.75 * hour.temp_c + 0.25 * Math.min(overnightLow, hour.temp_c);
  const clear = Math.max(0, (60 - hour.cloud_pct) / 60); // 1 under a clear sky, 0 at 60 % cloud and over
  const h = Number(hour.time.slice(11, 13));
  const lowSun = !hour.is_day || h < 10 || h >= 16;
  const cooling = clear * (lowSun ? 3 : 1);
  return Math.round(Math.min(0, lagged - cooling) * 2) / 2 || 0; // nearest half degree; never "−0"
}

/**
 * The snowball test's likely answer, from air temperature and humidity.
 * Snow near 0 °C holds water; cold snow under dry air does not.
 */
export function guessSnowHumidity(snowTemp: number, rh: number, rainedRecently: boolean): HumidityBand {
  if (rainedRecently || snowTemp >= -0.5) return "wet";
  if (snowTemp >= -3 && rh > 80) return "wet";
  if (snowTemp >= -5 || rh > 85) return "mid";
  return "dry";
}

/**
 * A starting guess at the snow type, from what fell and how warm it got.
 * The skier sees the trail; this only saves a tap when the guess is right.
 */
export function guessSnowType(input: {
  newSnow24h: number; // cm in the 24 h before the start
  fallingNow: boolean; // snowing during the session
  maxTemp48h: number; // warmest hour in the 48 h before the start
  snowTemp: number;
  rainedRecently: boolean;
}): SnowType {
  if (input.fallingNow || input.newSnow24h >= 5) return "falling";
  if (input.rainedRecently || input.snowTemp >= -0.5) return "wet";
  if (input.newSnow24h >= 1) return "fresh_set";
  // A thaw then a freeze leaves the track glazed and the snow coarse.
  if (input.maxTemp48h > 1 && input.snowTemp <= -3) return "icy";
  if (input.maxTemp48h > 0) return "transformed";
  return "fine_grained";
}
