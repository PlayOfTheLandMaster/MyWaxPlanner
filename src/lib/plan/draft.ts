// A plan's conditions before the skier taps "Use this plan".
//
// Step 1 of planning used to save a conditions row as soon as the skier moved
// on, so trying a plan left records behind. Now the conditions travel to step
// 2 inside the page address, encoded here, and are saved only together with
// the session. Pure, so it can be tested; nothing here touches the database.
//
// The address can be edited by anyone holding it, so decoding checks every
// field again rather than trusting what it finds.

import { HUMIDITY_BANDS, SNOW_TYPES, type HumidityBand, type SnowType } from "@/lib/catalogue/vocab";
import { SKIES, TRACKS, type Sky, type Track } from "@/lib/history/vocab";

export type DraftConditions = {
  venue_id: string;
  observed_at: string;
  air_temp_c: number | null;
  air_temp_min_c: number | null;
  air_temp_max_c: number | null;
  overnight_low_c: number | null;
  snow_temp_c: number | null;
  snow_temp_estimated: boolean;
  air_rh_pct: number | null;
  snow_humidity_band: HumidityBand | null;
  snow_type: SnowType | null;
  new_snow_cm: number | null;
  sky: Sky | null;
  wind_kmh: number | null;
  track: Track | null;
  notes: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The same ranges the database and the conditions form use. */
const RANGES: Record<string, [number, number]> = {
  air_temp_c: [-60, 40],
  air_temp_min_c: [-60, 40],
  air_temp_max_c: [-60, 40],
  overnight_low_c: [-60, 40],
  snow_temp_c: [-40, 0],
  air_rh_pct: [0, 100],
  new_snow_cm: [0, 300],
  wind_kmh: [0, 300],
};

const toBase64Url = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const fromBase64Url = (s: string) => Buffer.from(s, "base64url").toString("utf8");

export function encodeDraft(d: DraftConditions): string {
  return toBase64Url(JSON.stringify(d));
}

/** The draft in an address, or null when it is missing, damaged or out of range. */
export function decodeDraft(raw: string | null | undefined): DraftConditions | null {
  if (!raw || raw.length > 4000) return null;
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(fromBase64Url(raw));
  } catch {
    return null;
  }
  if (!v || typeof v !== "object") return null;

  if (typeof v.venue_id !== "string" || !UUID.test(v.venue_id)) return null;
  if (typeof v.observed_at !== "string" || Number.isNaN(Date.parse(v.observed_at))) return null;

  const nums: Partial<Record<keyof DraftConditions, number | null>> = {};
  for (const [k, [min, max]] of Object.entries(RANGES)) {
    const n = v[k];
    if (n === null || n === undefined) nums[k as keyof DraftConditions] = null;
    else if (typeof n === "number" && Number.isFinite(n) && n >= min && n <= max) nums[k as keyof DraftConditions] = n;
    else return null;
  }
  const pick = <T extends string>(list: readonly T[], x: unknown): T | null | "bad" =>
    x === null || x === undefined ? null : typeof x === "string" && (list as readonly string[]).includes(x) ? (x as T) : "bad";
  const humidity = pick(HUMIDITY_BANDS, v.snow_humidity_band);
  const snowType = pick(SNOW_TYPES, v.snow_type);
  const sky = pick(SKIES, v.sky);
  const track = pick(TRACKS, v.track);
  if (humidity === "bad" || snowType === "bad" || sky === "bad" || track === "bad") return null;

  return {
    venue_id: v.venue_id,
    observed_at: new Date(v.observed_at).toISOString(),
    air_temp_c: nums.air_temp_c ?? null,
    air_temp_min_c: nums.air_temp_min_c ?? null,
    air_temp_max_c: nums.air_temp_max_c ?? null,
    overnight_low_c: nums.overnight_low_c ?? null,
    snow_temp_c: nums.snow_temp_c ?? null,
    snow_temp_estimated: v.snow_temp_estimated === true,
    air_rh_pct: nums.air_rh_pct ?? null,
    snow_humidity_band: humidity,
    snow_type: snowType,
    new_snow_cm: nums.new_snow_cm ?? null,
    sky,
    wind_kmh: nums.wind_kmh ?? null,
    track,
    notes: typeof v.notes === "string" ? v.notes.slice(0, 200) : null,
  };
}

/** The air humidity band the database derives from relative humidity (initial schema). */
export function airHumidityBand(rh: number | null): HumidityBand | null {
  if (rh === null) return null;
  if (rh < 50) return "dry";
  if (rh <= 80) return "mid";
  return "wet";
}
