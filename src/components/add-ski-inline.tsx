"use client";

import { useState, useTransition } from "react";
import { SKI_BRANDS, SKI_CATEGORIES, SKI_CATEGORY_LABELS, TECHNIQUES, TECHNIQUE_LABELS, type Technique } from "@/lib/skis/input";
import { quickAddSki, type AddedSki } from "@/app/(app)/wax-box/skis/actions";

const small = "min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-sm";
const label = "flex flex-col gap-1 text-xs font-medium";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

/**
 * Add a pair of skis… inside a wax job or a plan: maker (first, and asked
 * for: the owner's call), name, technique and grip type, saved for whoever the session is for, then picked. The rest of a
 * pair's details are on its page in the Wax box. Not a <form>: it sits
 * inside the session's own form, and forms cannot nest.
 */
export function AddSkiInline({
  owner,
  technique: preset,
  onAdded,
  onCancel,
}: {
  /** Whose pair: a skier id, or null for the account holder. */
  owner: string | null;
  technique?: Technique | null;
  onAdded: (ski: NonNullable<AddedSki["ski"]>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [technique, setTechnique] = useState<Technique | "">(preset ?? "");
  const [category, setCategory] = useState("waxable");
  const [brand, setBrand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      setError(null);
      const f = new FormData();
      f.set("name", name);
      f.set("technique", technique);
      if (technique === "classic") f.set("category", category);
      f.set("brand", brand);
      try {
        const r = await quickAddSki(owner, f);
        if (r.ski) onAdded(r.ski);
        else setError(r.error ?? "The skis could not be added.");
      } catch {
        setError("The skis could not be added. Check the connection and try again.");
      }
    });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-accent bg-tile p-2">
      <p className="text-sm font-medium">Add a pair of skis</p>
      <label className={label}>
        Maker
        <input value={brand} onChange={(e) => setBrand(e.target.value)} list="add-ski-brands" placeholder="e.g. Fischer" autoFocus className={small} />
        <datalist id="add-ski-brands">
          {SKI_BRANDS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </label>
      <label className={label}>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Race classic, Rock skis" className={small} />
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs font-medium">Technique</legend>
        <div className="grid grid-cols-2 gap-2">
          {TECHNIQUES.map((t) => (
            <label key={t} className={choice}>
              <input type="radio" name="add-ski-technique" checked={technique === t} onChange={() => setTechnique(t)} className="sr-only" />
              {TECHNIQUE_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>
      {technique === "classic" && (
        <label className={label}>
          Grip type
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={small}>
            {SKI_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SKI_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-xs text-muted">Grind, flex and the rest can be added later on the pair&apos;s page in the Wax box.</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={add}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add & use"}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center text-sm text-link underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
