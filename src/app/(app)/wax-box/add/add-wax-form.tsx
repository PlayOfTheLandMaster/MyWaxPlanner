"use client";

import { startTransition, useActionState, useState } from "react";
import { addWax, type AddWaxState } from "../actions";
import {
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  FLUORO_LABELS,
  FORM_LABELS,
  HUMIDITY_LABELS,
  LAYER_ROLE_LABELS,
  SNOW_TYPE_LABELS,
  AMOUNT_LABELS,
} from "@/lib/catalogue/labels";
import {
  FLUORO_STATUSES,
  HUMIDITY_BANDS,
  LAYER_ROLES,
  PRODUCT_FORMS,
  SNOW_TYPES,
  type TemperatureBasis,
} from "@/lib/catalogue/vocab";

export type KnownBrand = { name: string; temperature_basis: TemperatureBasis };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";

export function AddWaxForm({ brands }: { brands: KnownBrand[] }) {
  const [state, action, pending] = useActionState<AddWaxState, FormData>(addWax, {});
  const [brand, setBrand] = useState("");
  const [newBasis, setNewBasis] = useState<TemperatureBasis | "">("");
  const [moreOpen, setMoreOpen] = useState(false);

  const known = brands.find((b) => b.name.toLowerCase() === brand.trim().toLowerCase());
  const isNewBrand = brand.trim() !== "" && !known;
  const basis = known?.temperature_basis ?? (newBasis || undefined);

  return (
    <form
      // Submitted by hand rather than with action={…}: React empties a form
      // after its action runs, and a refused save should not cost the skier
      // every field they typed. The browser's own checks (required) still run
      // before this handler is called.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-5"
    >
      <label className={label}>
        Brand
        <input
          name="brand"
          list="known-brands"
          required
          autoComplete="off"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className={field}
        />
        <datalist id="known-brands">
          {brands.map((b) => (
            <option key={b.name} value={b.name} />
          ))}
        </datalist>
      </label>

      {isNewBrand && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-medium">
            How does {brand.trim()} rate its waxes?
          </legend>
          <p className="text-sm text-muted">
            Printed on the packaging or the brand&apos;s wax chart. You only answer this once per brand.
          </p>
          {(["snow", "air"] as const).map((b) => (
            <label key={b} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name="temperature_basis"
                value={b}
                required
                checked={newBasis === b}
                onChange={() => setNewBasis(b)}
                className="size-5"
              />
              By {b} temperature
            </label>
          ))}
        </fieldset>
      )}

      <label className={label}>
        Wax name
        <input name="name" required autoComplete="off" className={field} placeholder="e.g. the colour or code on the label" />
      </label>

      <label className={label}>
        Type
        <select name="category" required defaultValue="" className={field}>
          <option value="" disabled>
            Choose…
          </option>
          {CATEGORY_GROUPS.map((g) => (
            <optgroup key={g.key} label={g.label}>
              {g.categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          Temperature range{basis === "air" ? " (air, as printed)" : basis === "snow" ? " (snow, as printed)" : ""}, °C
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            <span className="font-normal text-muted">From</span>
            <input name="published_temp_min_c" inputMode="decimal" placeholder="−12" className={field} />
          </label>
          <label className={label}>
            <span className="font-normal text-muted">To</span>
            <input name="published_temp_max_c" inputMode="decimal" placeholder="−6" className={field} />
          </label>
        </div>
      </fieldset>

      {basis === "air" && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-medium">Snow temperature range, °C (optional)</legend>
          <p className="text-sm text-muted">
            Recommendations compare snow temperatures. The app will not guess this from the air range,
            because it depends on sun, humidity and the night before. Leave it blank if you don&apos;t know;
            the wax is still saved, it just won&apos;t be recommended until it has one.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              <span className="font-normal text-muted">From</span>
              <input name="snow_temp_min_c" inputMode="decimal" className={field} />
            </label>
            <label className={label}>
              <span className="font-normal text-muted">To</span>
              <input name="snow_temp_max_c" inputMode="decimal" className={field} />
            </label>
          </div>
        </fieldset>
      )}

      <label className={label}>
        Fluoro
        <select name="fluoro_status" defaultValue="fluoro_free" className={field}>
          {FLUORO_STATUSES.map((f) => (
            <option key={f} value={f}>
              {FLUORO_LABELS[f]}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">How much is left?</legend>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(AMOUNT_LABELS) as (keyof typeof AMOUNT_LABELS)[]).map((a) => (
            <label
              key={a}
              className="flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold"
            >
              <input type="radio" name="amount_left" value={a} defaultChecked={a === "full"} className="sr-only" />
              {AMOUNT_LABELS[a]}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen(!moreOpen)}
        className="min-h-11 self-start text-sm text-link underline active:opacity-70"
      >
        {moreOpen ? "Fewer details" : "More details (snow types, humidity, iron temperature…)"}
      </button>

      {/* Hidden rather than unmounted, so folding it away keeps what was typed. */}
      <div hidden={!moreOpen} className="flex flex-col gap-5">
        <CheckGroup legend="Snow types it suits" name="snow_types" values={SNOW_TYPES} labels={SNOW_TYPE_LABELS} />
        <CheckGroup legend="Snow humidity" name="humidity_bands" values={HUMIDITY_BANDS} labels={HUMIDITY_LABELS} columns />
        <CheckGroup legend="Used as" name="layer_roles" values={LAYER_ROLES} labels={LAYER_ROLE_LABELS} />

        <label className={label}>
          Form
          <select name="form" defaultValue="" className={field}>
            <option value="">—</option>
            {PRODUCT_FORMS.map((f) => (
              <option key={f} value={f}>
                {FORM_LABELS[f]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          Iron temperature, °C
          <input name="iron_temp_c" inputMode="numeric" placeholder="e.g. 130" className={field} />
        </label>

        <label className={label}>
          Notes
          <textarea name="notes" rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base" />
        </label>
      </div>

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
        {pending ? "Adding…" : "Add to wax box"}
      </button>
    </form>
  );
}

function CheckGroup<T extends string>({
  legend,
  name,
  values,
  labels,
  columns = false,
}: {
  legend: string;
  name: string;
  values: readonly T[];
  labels: Record<T, string>;
  columns?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className={columns ? "grid grid-cols-3 gap-2" : "flex flex-col"}>
        {values.map((v) => (
          <label key={v} className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name={name} value={v} className="size-5 shrink-0" />
            {labels[v]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
