// The forecast for where and when you will ski: a venue's coordinates and
// elevation, and the hours you will be on the trail. Never the phone's own
// location, which may be in Calgary while the skiing is in Lake Louise.
//
// Data: Open-Meteo (https://open-meteo.com), free for non-commercial use with
// no key. Their terms ask for a paid plan for commercial use, so a paid
// version of this app needs an API key added here.

import {
  airHumidityBand,
  estimateSnowTemp,
  guessSnowHumidity,
  guessSnowType,
  type Hour,
} from "./snow";
import type { HumidityBand, SnowType } from "@/lib/catalogue/vocab";
import type { Sky } from "@/lib/history/vocab";

export type Venue = { id: string; name: string; latitude: number; longitude: number; elevation_m: number | null };

export type ForecastWindow = {
  venue: Venue;
  /** Venue-local start as given, "2026-11-15T09:03", and the exact moment it is. The hourly figures use the hour it falls in. */
  start: string;
  startIso: string;
  hours: Hour[]; // the session's hours
  utcOffsetSeconds: number;
  timezone: string;
  elevation_m: number; // what Open-Meteo used
  air_temp_c: number; // at the start
  air_temp_min_c: number;
  air_temp_max_c: number;
  overnight_low_c: number | null;
  air_rh_pct: number; // mean over the session
  air_humidity_band: HumidityBand;
  wind_kmh: number; // strongest
  new_snow_cm: number; // 24 h before the start
  snowfall_during_cm: number;
  sky: Sky;
  snow_temp_c: number; // estimate at the start
  snow_temp_range: [number, number]; // coldest and warmest over the session
  snow_humidity_band: HumidityBand; // estimate
  snow_type: SnowType; // estimate
};

const HOURLY = [
  "temperature_2m",
  "relative_humidity_2m",
  "snowfall",
  "rain",
  "cloud_cover",
  "wind_speed_10m",
  "weather_code",
  "is_day",
].join(",");

type OpenMeteo = {
  elevation: number;
  utc_offset_seconds: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    snowfall: (number | null)[];
    rain: (number | null)[];
    cloud_cover: (number | null)[];
    wind_speed_10m: (number | null)[];
    weather_code: (number | null)[];
    is_day: (number | null)[];
  };
};

export class ForecastError extends Error {}

/** All forecast hours for a venue: yesterday through six days ahead. */
export async function fetchHours(venue: Venue): Promise<{ hours: Hour[]; data: OpenMeteo }> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(venue.latitude));
  url.searchParams.set("longitude", String(venue.longitude));
  // The venue's own height, so a trail at 1,540 m is not forecast at the
  // average height of a mountain grid cell.
  if (venue.elevation_m !== null) url.searchParams.set("elevation", String(venue.elevation_m));
  url.searchParams.set("hourly", HOURLY);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("past_days", "2");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("wind_speed_unit", "kmh");

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new ForecastError("The weather service did not answer. Try again in a minute.");
  }
  if (!res.ok) throw new ForecastError(`The weather service refused the request (${res.status}).`);
  const data = (await res.json()) as OpenMeteo;
  const h = data.hourly;
  const hours: Hour[] = [];
  h.time.forEach((time, i) => {
    if (h.temperature_2m[i] === null) return;
    hours.push({
      time,
      temp_c: h.temperature_2m[i] as number,
      rh_pct: h.relative_humidity_2m[i] ?? 70,
      snowfall_cm: h.snowfall[i] ?? 0,
      rain_mm: h.rain[i] ?? 0,
      cloud_pct: h.cloud_cover[i] ?? 50,
      wind_kmh: h.wind_speed_10m[i] ?? 0,
      weather_code: h.weather_code[i] ?? 0,
      is_day: h.is_day[i] === 1,
    });
  });
  return { hours, data };
}

/** WMO weather codes to the sky words the app stores. */
export function skyOf(hours: Hour[]): Sky {
  const codes = hours.map((h) => h.weather_code);
  if (codes.some((c) => (c >= 71 && c <= 77) || c === 85 || c === 86)) return "snowing";
  if (codes.some((c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82))) return "raining";
  if (codes.some((c) => c === 45 || c === 48)) return "fog";
  const cloud = hours.reduce((s, h) => s + h.cloud_pct, 0) / hours.length;
  if (cloud < 25) return "sun";
  if (cloud < 70) return "partly_cloudy";
  return "overcast";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Summarise the hours a session covers. `start` is venue-local time
 * ("2026-11-15T11:00"), as Open-Meteo labels its hours with timezone=auto.
 */
export function summarise(all: Hour[], venue: Venue, data: Pick<OpenMeteo, "utc_offset_seconds" | "timezone" | "elevation">, start: string, durationHours: number): ForecastWindow {
  const startHour = start.slice(0, 13) + ":00";
  const i = all.findIndex((h) => h.time === startHour);
  if (i < 0) throw new ForecastError("That time is outside the forecast, which covers the next six days.");
  const hours = all.slice(i, i + Math.max(1, durationHours));
  const before = (n: number) => all.slice(Math.max(0, i - n), i);

  // The coldest hour in the 12 before the start: the night the snow froze in.
  const night = before(12);
  const overnightLow = night.length ? Math.min(...night.map((h) => h.temp_c)) : null;
  const newSnow = round1(before(24).reduce((s, h) => s + h.snowfall_cm, 0));
  const rained = before(12).some((h) => h.rain_mm > 0.2) || hours.some((h) => h.rain_mm > 0.2);
  const maxTemp48h = Math.max(...before(48).map((h) => h.temp_c), hours[0].temp_c);

  const snowTemps = hours.map((h) => estimateSnowTemp(h, overnightLow));
  const rh = Math.round(hours.reduce((s, h) => s + h.rh_pct, 0) / hours.length);
  const snowTemp = snowTemps[0];
  const snowfallDuring = round1(hours.reduce((s, h) => s + h.snowfall_cm, 0));

  // Venue-local start to an exact moment, using the offset Open-Meteo reports.
  // The exact start the skier gave (minutes included), as a moment in time.
  const exact = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start) ? start.slice(0, 16) : startHour;
  const [d, t] = exact.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const startIso = new Date(
    Date.UTC(y, mo - 1, da, Number(t.slice(0, 2)), Number(t.slice(3, 5))) - data.utc_offset_seconds * 1000,
  ).toISOString();

  return {
    venue,
    start: exact,
    startIso,
    hours,
    utcOffsetSeconds: data.utc_offset_seconds,
    timezone: data.timezone,
    elevation_m: Math.round(data.elevation),
    air_temp_c: round1(hours[0].temp_c),
    air_temp_min_c: round1(Math.min(...hours.map((h) => h.temp_c))),
    air_temp_max_c: round1(Math.max(...hours.map((h) => h.temp_c))),
    overnight_low_c: overnightLow === null ? null : round1(overnightLow),
    air_rh_pct: rh,
    air_humidity_band: airHumidityBand(rh),
    wind_kmh: round1(Math.max(...hours.map((h) => h.wind_kmh))),
    new_snow_cm: newSnow,
    snowfall_during_cm: snowfallDuring,
    sky: skyOf(hours),
    snow_temp_c: snowTemp,
    snow_temp_range: [Math.min(...snowTemps), Math.max(...snowTemps)],
    snow_humidity_band: guessSnowHumidity(snowTemp, rh, rained),
    snow_type: guessSnowType({
      newSnow24h: newSnow,
      fallingNow: snowfallDuring >= 0.5,
      maxTemp48h,
      snowTemp,
      rainedRecently: rained,
    }),
  };
}

/** Today's date and the next whole hour at a venue, from its UTC offset. */
export function venueNow(utcOffsetSeconds: number, now = new Date()): { date: string; hour: string } {
  const local = new Date(now.getTime() + utcOffsetSeconds * 1000 + 3600_000);
  return { date: local.toISOString().slice(0, 10), hour: local.toISOString().slice(11, 13) + ":00" };
}

export type Place = { name: string; detail: string; latitude: number; longitude: number; elevation_m: number | null };

/** Places matching a name, for adding a venue. Open-Meteo's geocoder (GeoNames). */
export async function searchPlaces(name: string): Promise<Place[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new ForecastError("The place search did not answer. Try again in a minute.");
  }
  if (!res.ok) throw new ForecastError(`The place search refused the request (${res.status}).`);
  const data = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; elevation?: number; admin1?: string; country?: string }[];
  };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(", "),
    latitude: Math.round(r.latitude * 1e5) / 1e5,
    longitude: Math.round(r.longitude * 1e5) / 1e5,
    elevation_m: typeof r.elevation === "number" ? Math.round(r.elevation) : null,
  }));
}
