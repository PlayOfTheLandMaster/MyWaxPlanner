"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HUMIDITY_BANDS, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { SKIES, TRACKS } from "@/lib/history/vocab";

export type ConditionsFormState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function num(form: FormData, key: string, min: number, max: number): number | null {
  const raw = String(form.get(key) ?? "").trim().replace(",", ".").replace(/[−–]/g, "-");
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(key);
  return Math.round(n * 10) / 10;
}

const oneOf = <T extends string>(list: readonly T[], v: FormDataEntryValue | null): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

/**
 * Save the conditions a plan is built on: the venue's forecast for the
 * session window, with whatever the skier corrected after looking at the snow.
 */
export async function saveConditions(_prev: ConditionsFormState, form: FormData): Promise<ConditionsFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const venueId = String(form.get("venue_id") ?? "");
  const startIso = String(form.get("start_iso") ?? "");
  if (!UUID.test(venueId) || Number.isNaN(Date.parse(startIso))) {
    return { error: "The forecast could not be read. Reload the page and try again." };
  }

  let row;
  try {
    const snowTemp = num(form, "snow_temp_c", -40, 0);
    const estimate = num(form, "snow_temp_estimate", -40, 0);
    row = {
      user_id: auth.user.id,
      venue_id: venueId,
      observed_at: startIso,
      source: "forecast" as const,
      air_temp_c: num(form, "air_temp_c", -60, 40),
      air_temp_min_c: num(form, "air_temp_min_c", -60, 40),
      air_temp_max_c: num(form, "air_temp_max_c", -60, 40),
      overnight_low_c: num(form, "overnight_low_c", -60, 40),
      snow_temp_c: snowTemp,
      // Only an untouched estimate counts as estimated; a number the skier typed
      // (from a snow thermometer, say) is kept as theirs.
      snow_temp_estimated: snowTemp === estimate,
      air_rh_pct: num(form, "air_rh_pct", 0, 100),
      snow_humidity_band: oneOf(HUMIDITY_BANDS, form.get("snow_humidity_band")),
      snow_type: oneOf(SNOW_TYPES, form.get("snow_type")),
      new_snow_cm: num(form, "new_snow_cm", 0, 300),
      sky: oneOf(SKIES, form.get("sky")),
      wind_kmh: num(form, "wind_kmh", 0, 300),
      track: oneOf(TRACKS, form.get("track")),
      notes: String(form.get("window") ?? "").slice(0, 200) || null,
    };
  } catch (e) {
    if (e instanceof RangeError) {
      return {
        error:
          e.message === "snow_temp_c"
            ? "Snow temperature is 0 °C or colder, for example −6."
            : "One of the numbers is out of range. Reload the forecast and try again.",
      };
    }
    throw e;
  }

  const { data, error } = await supabase.from("conditions").insert(row).select("id").single();
  if (error) return { error: `Could not save the conditions: ${error.message}` };
  redirect(`/plan/${data.id}`);
}
