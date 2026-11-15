"use client";

import { startTransition, useActionState } from "react";
import { saveConditions, type ConditionsFormState } from "./actions";
import type { ForecastWindow } from "@/lib/weather/forecast";
import { SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { HUMIDITY_BANDS, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { TRACKS, TRACK_LABELS } from "@/lib/history/vocab";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

const SNOWBALL = {
  dry: "Falls apart — dry (0–25 %)",
  mid: "Loose ball — mid (20–35 %)",
  wet: "Packs into a wet ball — wet (30–100 %)",
} as const;

/** The forecast's snow guesses, for the skier to confirm or correct. */
export function ConditionsForm({ w }: { w: ForecastWindow }) {
  const [state, action, pending] = useActionState<ConditionsFormState, FormData>(saveConditions, {});
  const hidden: Record<string, string | number | null> = {
    venue_id: w.venue.id,
    start_iso: w.startIso,
    window: `${w.start.slice(0, 16)} local, ${w.hours.length} h`,
    air_temp_c: w.air_temp_c,
    air_temp_min_c: w.air_temp_min_c,
    air_temp_max_c: w.air_temp_max_c,
    overnight_low_c: w.overnight_low_c,
    air_rh_pct: w.air_rh_pct,
    new_snow_cm: w.new_snow_cm,
    sky: w.sky,
    wind_kmh: w.wind_kmh,
    snow_temp_estimate: w.snow_temp_c,
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v ?? ""} />
      ))}
      <div>
        <h2 className="font-semibold">Check the snow</h2>
        <p className="text-sm text-muted">
          Filled in from the forecast. If you&apos;re already at the trail, a snowball and a glance at the track beat any estimate.
        </p>
      </div>
      <label className={label}>
        Snow temperature at the start, °C
        <input name="snow_temp_c" inputMode="decimal" defaultValue={w.snow_temp_c} className={field} />
        <span className="font-normal text-muted">Estimated from the air, the night&apos;s low and the cloud. Change it if you measured it.</span>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Snowball test — squeeze a handful</legend>
        {HUMIDITY_BANDS.map((b) => (
          <label key={b} className={choice}>
            <input type="radio" name="snow_humidity_band" value={b} defaultChecked={w.snow_humidity_band === b} className="sr-only" />
            {SNOWBALL[b]}
          </label>
        ))}
      </fieldset>
      <label className={label}>
        Snow type
        <select name="snow_type" defaultValue={w.snow_type} className={field}>
          {SNOW_TYPES.map((t) => (
            <option key={t} value={t}>
              {SNOW_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Track
        <select name="track" defaultValue="" className={field}>
          <option value="">Not sure yet</option>
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {TRACK_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50">
        {pending ? "Saving…" : "Use these conditions"}
      </button>
    </form>
  );
}
