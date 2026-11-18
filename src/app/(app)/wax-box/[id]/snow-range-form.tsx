"use client";

import { startTransition, useActionState } from "react";
import type { WaxFormState } from "../actions";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const num = (n: number | null) => (n === null ? "" : String(n));

/**
 * The skier's own snow range for a shared wax. Shared waxes carry only the
 * range printed on them, which is an air temperature, and plans compare snow
 * temperatures, so without this a shared wax is never recommended.
 */
export function SnowRangeForm({
  printed,
  yours,
  save,
  clear,
}: {
  printed: string | null;
  yours: { temp_min_c: number | null; temp_max_c: number | null; old_temp_min_c?: number | null; old_temp_max_c?: number | null } | null;
  save: (prev: WaxFormState, data: FormData) => Promise<WaxFormState>;
  clear: () => Promise<void>;
}) {
  const [state, action, pending] = useActionState<WaxFormState, FormData>(save, {});

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      <div>
        <h2 className="font-semibold">Your snow range</h2>
        <p className="mt-1 text-sm text-muted">
          {printed ? `The packaging gives ${printed}, as an air temperature. ` : ""}
          Plans compare snow temperatures, so this wax is only recommended once you enter the snow range it works in, from
          your own testing or the brand&apos;s snow chart. Only you see it.
        </p>
      </div>
      <form
        // Submitted by hand so a refused save keeps what was typed (React
        // empties a form after an action={…} submission).
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            <span className="font-normal text-muted">From, °C</span>
            <input name="snow_temp_min_c" inputMode="decimal" placeholder="−8" defaultValue={num(yours?.temp_min_c ?? null)} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            <span className="font-normal text-muted">To, °C</span>
            <input name="snow_temp_max_c" inputMode="decimal" placeholder="−2" defaultValue={num(yours?.temp_max_c ?? null)} className={field} />
          </label>
        </div>
        {/* A second range for old or transformed snow, as Swix prints on its kick
            waxes; plans use it on fine-grained, transformed, icy, wet, dirty or
            man-made snow. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Old or transformed snow (optional)</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              <span className="font-normal text-muted">From, °C</span>
              <input name="old_snow_temp_min_c" inputMode="decimal" placeholder="−10" defaultValue={num(yours?.old_temp_min_c ?? null)} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              <span className="font-normal text-muted">To, °C</span>
              <input name="old_snow_temp_max_c" inputMode="decimal" placeholder="−3" defaultValue={num(yours?.old_temp_max_c ?? null)} className={field} />
            </label>
          </div>
          <p className="text-xs text-muted">The boxes above are then for new snow (falling or fresh).</p>
        </fieldset>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
          >
            {pending ? "Saving…" : yours ? "Save snow range" : "Add snow range"}
          </button>
          {yours && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => clear())}
              className="min-h-11 rounded-lg border border-line px-4 active:bg-tile disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
