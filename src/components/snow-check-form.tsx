"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveSnowCheck, type SnowCheckState } from "@/app/(app)/snow-actions";
import { SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { HUMIDITY_BANDS, SNOW_TYPES, type HumidityBand, type SnowType } from "@/lib/catalogue/vocab";
import { TRACKS, TRACK_LABELS, type Track } from "@/lib/history/vocab";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

const SNOWBALL = {
  dry: "Falls apart — dry (0–25 %)",
  mid: "Loose ball — mid (20–35 %)",
  wet: "Packs into a wet ball — wet (30–100 %)",
} as const;

export type SnowInitial = { snow_temp_c: number; snow_humidity_band: HumidityBand; snow_type: SnowType; track: Track | null };

/** Today's Skiing Conditions: the snow check every wax job today will use. */
export function SnowCheckForm({
  venueId,
  day,
  initial,
  editing = false,
}: {
  venueId: string;
  day: string;
  initial: SnowInitial;
  /** Conditions were already saved today: the button saves a change. */
  editing?: boolean;
}) {
  const [state, action, pending] = useActionState<SnowCheckState, FormData>(saveSnowCheck, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Saved: fold the card back up. Its title line now shows what was saved.
  useEffect(() => {
    if (state.saved) formRef.current?.closest("details")?.removeAttribute("open");
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="venue_id" value={venueId} />
      <input type="hidden" name="day" value={day} />
      <SnowFields initial={initial} />
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm">
          Saved. Every wax job today uses these conditions.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Use for today's wax jobs"}
      </button>
    </form>
  );
}

/**
 * The snow as the skier found it: temperature, the snowball test, type and
 * track. Today's Skiing Conditions and "How did it go?" (when the snow was
 * different from the forecast) ask the same questions in the same words.
 */
export function SnowFields({ initial }: { initial: SnowInitial }) {
  return (
    <>
      <label className={label}>
        Snow temperature, °C
        <input name="snow_temp_c" inputMode="decimal" defaultValue={initial.snow_temp_c} className={field} />
        <span className="font-normal text-muted">Change it if you measured it.</span>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Snowball test — squeeze a handful</legend>
        {HUMIDITY_BANDS.map((b) => (
          <label key={b} className={choice}>
            <input type="radio" name="snow_humidity_band" value={b} defaultChecked={initial.snow_humidity_band === b} className="sr-only" />
            {SNOWBALL[b]}
          </label>
        ))}
      </fieldset>
      <label className={label}>
        Snow type
        <select name="snow_type" defaultValue={initial.snow_type} className={field}>
          {SNOW_TYPES.map((t) => (
            <option key={t} value={t}>
              {SNOW_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Track
        <select name="track" defaultValue={initial.track ?? ""} className={field}>
          <option value="">Not sure yet</option>
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {TRACK_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
