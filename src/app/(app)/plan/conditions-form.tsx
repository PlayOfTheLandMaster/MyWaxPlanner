"use client";

import { startTransition, useActionState } from "react";
import { saveConditions, type ConditionsFormState } from "./actions";
import type { ForecastWindow } from "@/lib/weather/forecast";
import Link from "next/link";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { TRACK_LABELS } from "@/lib/history/vocab";
import type { SnowCheck } from "@/lib/snow/check";

const deg = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C";

/** Step 1's conditions: the forecast, with the snow as checked on Today (or estimated). */
export function ConditionsForm({
  w,
  check,
  isToday,
}: {
  w: ForecastWindow;
  /** Today's Skiing Conditions for this venue and day, if they were checked. */
  check: SnowCheck | null;
  /** The plan is for today, so Today's card is where the snow is checked. */
  isToday: boolean;
}) {
  const checked = check !== null;
  const snow = check ?? {
    snow_temp_c: Math.min(0, w.snow_temp_c),
    snow_humidity_band: w.snow_humidity_band,
    snow_type: w.snow_type,
    track: null,
  };
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
      {/* The snow is checked once a day on Today (Today's Skiing Conditions);
          every plan that day at this venue uses it, so it is not asked again. */}
      <input type="hidden" name="snow_temp_c" value={snow.snow_temp_c} />
      <input type="hidden" name="snow_humidity_band" value={snow.snow_humidity_band} />
      <input type="hidden" name="snow_type" value={snow.snow_type} />
      <input type="hidden" name="track" value={snow.track ?? ""} />
      <div>
        <h2 className="font-semibold">Snow conditions</h2>
        <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 text-sm">
          <dt className="text-muted">Snow temperature</dt>
          <dd>{deg(snow.snow_temp_c)}</dd>
          <dt className="text-muted">Snowball test</dt>
          <dd>{HUMIDITY_LABELS[snow.snow_humidity_band]}</dd>
          <dt className="text-muted">Snow type</dt>
          <dd>{SNOW_TYPE_LABELS[snow.snow_type]}</dd>
          {snow.track && (
            <>
              <dt className="text-muted">Track</dt>
              <dd>{TRACK_LABELS[snow.track]}</dd>
            </>
          )}
        </dl>
        <p className="mt-2 text-sm text-muted">
          {checked ? (
            <>From Today&apos;s Skiing Conditions. </>
          ) : (
            <>Estimated from the forecast. </>
          )}
          {isToday ? (
            <>
              Change them on{" "}
              <Link href="/" className="text-link underline">
                Today
              </Link>
              , once for every wax job today.
            </>
          ) : (
            <>On the day, check the snow on Today.</>
          )}
        </p>
      </div>
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
