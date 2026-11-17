"use client";

import { startTransition, useActionState, useState } from "react";
import type { SessionFormState } from "@/app/(app)/history/actions";
import { KICK_FEELS, KICK_FEEL_LABELS, RATING_WORDS } from "@/lib/history/vocab";
import { SnowFields, type SnowInitial } from "@/components/snow-check-form";

const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";
const section = "flex flex-col gap-4 rounded-xl border border-line bg-surface p-4";

/**
 * "How did it go?": the few taps that finish a session. Everything else
 * (durability, race result, photos, a full correction of layers or
 * conditions) stays on the full form, which this card leads to when needed.
 */
export function RateForm({
  classic,
  hasLayers,
  askSnow,
  initialNotes,
  snowInitial,
  save,
}: {
  classic: boolean;
  hasLayers: boolean;
  /** Only when there is a forecast to confirm and no actual conditions yet. */
  askSnow: boolean;
  initialNotes: string | null;
  /** Where the snow questions start when the snow was different: the forecast's guesses. */
  snowInitial: SnowInitial;
  save: (prev: SessionFormState, data: FormData) => Promise<SessionFormState>;
}) {
  const [state, action, pending] = useActionState<SessionFormState, FormData>(save, {});
  const [snow, setSnow] = useState("");

  return (
    <form
      // Submitted by hand so a refused save keeps every tap (React empties a
      // form after an action={…} submission).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-5"
    >
      <section className={section} aria-label="Ratings">
        <Rating name="glide_rating" legend="Glide" />
        {classic && <Rating name="grip_rating" legend="Grip" />}
        {classic && (
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">Kick</legend>
            <div className="grid grid-cols-3 gap-2">
              {KICK_FEELS.map((k) => (
                <label key={k} className={choice}>
                  <input type="radio" name="kick_feel" value={k} className="sr-only" />
                  {KICK_FEEL_LABELS[k]}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      {(hasLayers || askSnow) && (
        <section className={section} aria-label="Plan and reality">
          {hasLayers && (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium">The wax</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={choice}>
                  <input type="radio" name="waxed" value="planned" defaultChecked className="sr-only" />
                  Waxed as planned
                </label>
                <label className={choice}>
                  <input type="radio" name="waxed" value="changed" className="sr-only" />
                  I changed something
                </label>
              </div>
            </fieldset>
          )}
          {askSnow && (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium">The snow</legend>
              <div className="grid grid-cols-3 gap-2">
                <label className={choice}>
                  <input type="radio" name="snow" value="forecast" onChange={() => setSnow("forecast")} className="sr-only" />
                  As forecast
                </label>
                <label className={choice}>
                  <input type="radio" name="snow" value="different" onChange={() => setSnow("different")} className="sr-only" />
                  Different
                </label>
                <label className={choice}>
                  <input type="radio" name="snow" value="" defaultChecked onChange={() => setSnow("")} className="sr-only" />
                  Not sure
                </label>
              </div>
            </fieldset>
          )}
          {/* Different: the snow questions open here, rather than on another
              page. Hidden, not removed, so switching back and forth keeps
              what was entered; the server reads them only for Different. */}
          {askSnow && (
            <div hidden={snow !== "different"} className="flex flex-col gap-4 border-t border-line pt-4">
              <p className="text-sm font-medium">What was the snow like?</p>
              <SnowFields initial={snowInitial} />
            </div>
          )}
          {hasLayers && (
            <p className="text-xs text-muted">&ldquo;I changed something&rdquo; opens the full form next, so you can correct the waxes.</p>
          )}
        </section>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialNotes ?? ""}
          placeholder="Anything worth remembering next time"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function Rating({ name, legend }: { name: string; legend: string }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`${choice} flex-col gap-0 leading-tight`}>
            <input type="radio" name={name} value={n} className="sr-only" />
            <span className="text-base">{n}</span>
            <span className="text-[0.65rem] font-normal text-muted">{RATING_WORDS[n]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
