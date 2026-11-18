"use client";

import { startTransition, useActionState, useState } from "react";
import type { SessionFormState } from "@/app/(app)/history/actions";
import { KICK_FEELS, KICK_FEEL_LABELS, RATING_WORDS } from "@/lib/history/vocab";
import { SnowFields, type SnowInitial } from "@/components/snow-check-form";

const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";
const section = "flex flex-col gap-4 rounded-xl border border-line bg-surface p-4";
const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

/** One layer as the card names it, and the box waxes it could be swapped for. */
export type RateLayer = { id: string; zone: "glide" | "grip"; name: string };
export type RateBoxWax = { id: string; group: string; name: string };

/**
 * "How did it go?": the few taps that finish a session, all on this one card.
 * "I changed something" opens each layer's pull-down here and "Different"
 * opens the snow questions here, so one Save at the end saves everything.
 * Bigger corrections (adding a layer, durability, race result) are Edit this
 * record, from History, once it is rated.
 */
export function RateForm({
  classic,
  hasLayers,
  askSnow,
  initialNotes,
  snowInitial,
  layers = [],
  box = [],
  save,
}: {
  classic: boolean;
  hasLayers: boolean;
  /** The session's layers, for "I changed something". */
  layers?: RateLayer[];
  /** The box's waxes, offered by zone. */
  box?: RateBoxWax[];
  /** Only when there is a forecast to confirm and no actual conditions yet. */
  askSnow: boolean;
  initialNotes: string | null;
  /** Where the snow questions start when the snow was different: the forecast's guesses. */
  snowInitial: SnowInitial;
  save: (prev: SessionFormState, data: FormData) => Promise<SessionFormState>;
}) {
  const [state, action, pending] = useActionState<SessionFormState, FormData>(save, {});
  const [snow, setSnow] = useState("");
  const [waxed, setWaxed] = useState("planned");

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
                  <input type="radio" name="waxed" value="planned" defaultChecked onChange={() => setWaxed("planned")} className="sr-only" />
                  Waxed as planned
                </label>
                <label className={choice}>
                  <input type="radio" name="waxed" value="changed" onChange={() => setWaxed("changed")} className="sr-only" />
                  I changed something
                </label>
              </div>
            </fieldset>
          )}
          {/* I changed something: each layer's wax, right here. Hidden, not
              removed, so switching back and forth keeps the choices; the
              server reads them only for "changed". */}
          {hasLayers && (
            <div hidden={waxed !== "changed"} className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-sm font-medium">What went on instead?</p>
              {layers.map((l) => (
                <label key={l.id} className="flex flex-col gap-1 text-sm">
                  <span>
                    <span className="text-muted">{l.zone === "glide" ? "Glide" : "Grip"} · </span>
                    {l.name}
                  </span>
                  <select name={`layer_${l.id}`} defaultValue="" className={field}>
                    <option value="">Kept as it was</option>
                    {box
                      .filter((b) => b.group === l.zone)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    <option value="skip">Skipped this layer</option>
                  </select>
                </label>
              ))}
              <p className="text-xs text-muted">To add a layer, use Edit this record in History after saving.</p>
            </div>
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
