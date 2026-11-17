// Today's Snow Conditions: the skier's own check of the snow (snowball test,
// thermometer, a look at the track), made once on Today and used by every wax
// job that day at that venue — Plan a wax and Record a wax job alike. Stored
// on the profile as one record; a check from another day or venue is ignored.
// Pure, so it can be tested.

import { HUMIDITY_BANDS, SNOW_TYPES, type HumidityBand, type SnowType } from "@/lib/catalogue/vocab";
import { TRACKS, type Track } from "@/lib/history/vocab";

export type SnowCheck = {
  /** The venue's local date the check is for, "2026-11-17". */
  day: string;
  venue_id: string;
  snow_temp_c: number;
  snow_humidity_band: HumidityBand;
  snow_type: SnowType;
  track: Track | null;
  /** When it was saved (ISO). */
  checked_at: string;
};

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

/** The stored record, or null if it is missing or damaged. */
export function readSnowCheck(v: unknown): SnowCheck | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const temp = Number(o.snow_temp_c);
  const band = oneOf(HUMIDITY_BANDS, o.snow_humidity_band);
  const type = oneOf(SNOW_TYPES, o.snow_type);
  if (typeof o.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.day)) return null;
  if (typeof o.venue_id !== "string" || !Number.isFinite(temp) || temp > 0 || temp < -40 || !band || !type) return null;
  return {
    day: o.day,
    venue_id: o.venue_id,
    snow_temp_c: temp,
    snow_humidity_band: band,
    snow_type: type,
    track: oneOf(TRACKS, o.track),
    checked_at: typeof o.checked_at === "string" ? o.checked_at : "",
  };
}

/** The check, if it was made for this venue on this (venue-local) day. */
export function checkFor(check: SnowCheck | null, venueId: string, day: string): SnowCheck | null {
  return check && check.venue_id === venueId && check.day === day ? check : null;
}

/** The form's fields as a record to store, or an error to show. */
export function readSnowForm(
  form: FormData,
  where: { day: string; venue_id: string },
  now: Date,
): { check: SnowCheck } | { error: string } {
  const raw = String(form.get("snow_temp_c") ?? "")
    .trim()
    .replace(",", ".")
    .replace("−", "-");
  const temp = Number(raw);
  if (raw === "" || !Number.isFinite(temp)) return { error: "Enter the snow temperature, for example −6." };
  if (temp > 0 || temp < -40) return { error: "Snow temperature is 0 °C or colder, for example −6." };
  const band = oneOf(HUMIDITY_BANDS, form.get("snow_humidity_band"));
  const type = oneOf(SNOW_TYPES, form.get("snow_type"));
  if (!band) return { error: "Pick what the snowball did." };
  if (!type) return { error: "Pick the snow type." };
  return {
    check: {
      ...where,
      snow_temp_c: Math.round(temp * 10) / 10,
      snow_humidity_band: band,
      snow_type: type,
      track: oneOf(TRACKS, form.get("track")),
      checked_at: now.toISOString(),
    },
  };
}
