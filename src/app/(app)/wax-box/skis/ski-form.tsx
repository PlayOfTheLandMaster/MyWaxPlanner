"use client";

import { startTransition, useActionState, useState } from "react";
import type { SkiFormState } from "./actions";
import {
  SKI_CATEGORIES,
  SKI_CATEGORY_LABELS,
  TECHNIQUES,
  TECHNIQUE_LABELS,
  type SkiInput,
  type Technique,
} from "@/lib/skis/input";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";

export function SkiForm({
  save,
  initial,
  submitLabel,
}: {
  save: (prev: SkiFormState, data: FormData) => Promise<SkiFormState>;
  initial?: SkiInput;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<SkiFormState, FormData>(save, {});
  const [technique, setTechnique] = useState<Technique | "">(initial?.technique ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");

  return (
    <form
      // Submitted by hand so a refused save keeps what was typed (React
      // empties a form after an action={…} submission).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-5"
    >
      <label className={label}>
        Name
        <input
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="e.g. Race classic, Rock skis"
          className={field}
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Technique</legend>
        <div className="grid grid-cols-2 gap-2">
          {TECHNIQUES.map((t) => (
            <label
              key={t}
              className="flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold"
            >
              <input
                type="radio"
                name="technique"
                value={t}
                required
                checked={technique === t}
                onChange={() => setTechnique(t)}
                className="sr-only"
              />
              {TECHNIQUE_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>

      {technique === "classic" && (
        <label className={label}>
          Grip type
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={field}
          >
            <option value="">Choose…</option>
            {SKI_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SKI_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      )}

      {technique === "classic" && category === "waxable" && (
        <label className={label}>
          Grip zone length, cm
          <input
            name="grip_zone_cm"
            inputMode="decimal"
            defaultValue={initial?.grip_zone_cm ?? ""}
            placeholder="e.g. 60"
            className={field}
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Brand
          <input name="brand" defaultValue={initial?.brand ?? ""} className={field} />
        </label>
        <label className={label}>
          Model
          <input name="model" defaultValue={initial?.model ?? ""} className={field} />
        </label>
      </div>

      <label className={label}>
        Base material
        <input
          name="base_material"
          defaultValue={initial?.base_material ?? ""}
          placeholder="e.g. sintered race base"
          className={field}
        />
      </label>

      <label className={label}>
        Grind / structure
        <input
          name="grind"
          defaultValue={initial?.grind ?? ""}
          placeholder="e.g. fine, universal, or the grind's name"
          className={field}
        />
      </label>

      <label className={label}>
        Flex
        <input name="flex" defaultValue={initial?.flex ?? ""} placeholder="e.g. medium, or a number" className={field} />
      </label>

      <label className={label}>
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
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
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
