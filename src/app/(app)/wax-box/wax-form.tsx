"use client";

import { startTransition, useActionState, useState } from "react";
import type { WaxFormState } from "./actions";
import { AddPhoto } from "./add-photo";
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

/** What an existing wax fills the form with when it is being edited. */
export type WaxInitial = {
  brand: string;
  name: string;
  category: string;
  form: string | null;
  published_temp_min_c: number | null;
  published_temp_max_c: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  snow_types: string[];
  humidity_bands: string[];
  layer_roles: string[];
  fluoro_status: string;
  iron_temp_c: number | null;
  amount_left: string;
  notes: string | null;
};

const num = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";

/**
 * Adding a wax and editing one are the same form: `initial` fills it in, and
 * `save` is the server action that receives it.
 */
export function WaxForm({
  brands,
  save,
  initial,
  submitLabel,
  photoUserId,
}: {
  brands: KnownBrand[];
  /** Add a wax only: offers a photo of the container, saved with the wax. */
  photoUserId?: string;
  save: (prev: WaxFormState, data: FormData) => Promise<WaxFormState>;
  initial?: WaxInitial;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<WaxFormState, FormData>(save, {});
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [newBasis, setNewBasis] = useState<TemperatureBasis | "">("");
  // Editing opens the details, so nothing already saved is out of sight.
  const [moreOpen, setMoreOpen] = useState(initial !== undefined);

  // Glide, grip, cleaners or consumables first, so the type list stays short.
  const initialGroup = CATEGORY_GROUPS.find((g) => (g.categories as string[]).includes(initial?.category ?? ""))?.key ?? "glide";
  const [group, setGroup] = useState(initialGroup);
  const [category, setCategory] = useState(initial?.category ?? "");
  const shownGroup = CATEGORY_GROUPS.find((g) => g.key === group) ?? CATEGORY_GROUPS[0];

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
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">What is it?</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_GROUPS.map((g) => (
            <label
              key={g.key}
              className="flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-center text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold"
            >
              <input
                type="radio"
                name="kind"
                value={g.key}
                checked={group === g.key}
                onChange={() => {
                  setGroup(g.key);
                  if (!(g.categories as string[]).includes(category)) setCategory("");
                }}
                className="sr-only"
              />
              {g.key === "glide" ? "Glide wax" : g.key === "grip" ? "Grip wax" : g.label}
            </label>
          ))}
        </div>
      </fieldset>

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
        <input
          name="name"
          required
          autoComplete="off"
          defaultValue={initial?.name}
          className={field}
          placeholder="e.g. the colour or code on the label"
        />
      </label>

      <label className={label}>
        Type
        <select
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={field}
        >
          <option value="" disabled>
            Choose…
          </option>
          {shownGroup.categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
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
            <input
              name="published_temp_min_c"
              inputMode="decimal"
              placeholder="−12"
              defaultValue={num(initial?.published_temp_min_c)}
              className={field}
            />
          </label>
          <label className={label}>
            <span className="font-normal text-muted">To</span>
            <input
              name="published_temp_max_c"
              inputMode="decimal"
              placeholder="−6"
              defaultValue={num(initial?.published_temp_max_c)}
              className={field}
            />
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
              <input name="snow_temp_min_c" inputMode="decimal" defaultValue={num(initial?.temp_min_c)} className={field} />
            </label>
            <label className={label}>
              <span className="font-normal text-muted">To</span>
              <input name="snow_temp_max_c" inputMode="decimal" defaultValue={num(initial?.temp_max_c)} className={field} />
            </label>
          </div>
        </fieldset>
      )}

      <label className={label}>
        Fluoro
        <select name="fluoro_status" defaultValue={initial?.fluoro_status ?? "fluoro_free"} className={field}>
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
              <input type="radio" name="amount_left" value={a} defaultChecked={a === (initial?.amount_left ?? "full")} className="sr-only" />
              {AMOUNT_LABELS[a]}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen(!moreOpen)}
        className="fold-toggle inline-flex min-h-11 items-center self-start text-sm text-link underline active:opacity-70"
      >
        {moreOpen ? "Fewer details" : "More details (snow types, humidity, iron temperature…)"}
      </button>

      {/* Hidden rather than unmounted, so folding it away keeps what was typed. */}
      <div hidden={!moreOpen} className="flex flex-col gap-5">
        <CheckGroup
          legend="Snow types it suits"
          name="snow_types"
          values={SNOW_TYPES}
          labels={SNOW_TYPE_LABELS}
          checked={initial?.snow_types}
        />
        <CheckGroup
          legend="Snow humidity"
          name="humidity_bands"
          values={HUMIDITY_BANDS}
          labels={HUMIDITY_LABELS}
          checked={initial?.humidity_bands}
          columns
        />
        <CheckGroup
          legend="Used as"
          name="layer_roles"
          values={LAYER_ROLES}
          labels={LAYER_ROLE_LABELS}
          checked={initial?.layer_roles}
        />

        <label className={label}>
          Form
          <select name="form" defaultValue={initial?.form ?? ""} className={field}>
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
          <input
            name="iron_temp_c"
            inputMode="numeric"
            placeholder="e.g. 130"
            defaultValue={num(initial?.iron_temp_c)}
            className={field}
          />
        </label>

        <label className={label}>
          Notes
          <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base" />
        </label>
      </div>

      {photoUserId && <AddPhoto userId={photoUserId} />}

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

function CheckGroup<T extends string>({
  legend,
  name,
  values,
  labels,
  checked = [],
  columns = false,
}: {
  legend: string;
  name: string;
  values: readonly T[];
  labels: Record<T, string>;
  checked?: string[];
  columns?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className={columns ? "grid grid-cols-3 gap-2" : "flex flex-col"}>
        {values.map((v) => (
          <label key={v} className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              name={name}
              value={v}
              defaultChecked={checked.includes(v)}
              className="size-5 shrink-0"
            />
            {labels[v]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
