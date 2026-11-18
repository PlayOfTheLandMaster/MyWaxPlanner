"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CATEGORY_GROUPS, CATEGORY_LABELS } from "@/lib/catalogue/labels";
import type { WaxOption } from "@/lib/history/load";
import { addLayerWax, findLayerWaxes, quickAddLayerWax, type FoundWax } from "./layer-wax-actions";

const small = "min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-sm";
const label = "flex flex-col gap-1 text-xs font-medium";

/**
 * Add a wax… inside a layer: search the shared catalogue and the skier's own
 * waxes, tap one to put it in the box and use it here; or, when it is not
 * listed, add it by maker, name and type. Not a <form>: it sits inside the
 * wax job's form, and forms cannot nest.
 */
export function AddLayerWax({
  zone,
  onAdded,
  onType,
  onCancel,
}: {
  zone: "glide" | "grip";
  onAdded: (wax: WaxOption) => void;
  onType: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"search" | "new">("search");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<FoundWax[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const asked = useRef(0);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => box.current?.focus(), [step]);

  // Searched a moment after typing stops; only the latest answer is shown.
  useEffect(() => {
    const n = ++asked.current;
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        const r = await findLayerWaxes(q, zone);
        if (n === asked.current) setFound(r);
      } catch {
        if (n === asked.current) setError("The search did not answer. Try again.");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, zone]);

  const finish = (run: () => Promise<{ wax?: WaxOption; error?: string }>) =>
    start(async () => {
      setError(null);
      try {
        const r = await run();
        if (r.wax) onAdded(r.wax);
        else setError(r.error ?? "It could not be added.");
      } catch {
        setError("It could not be added. Check the connection and try again.");
      }
    });

  // New-wax fields, held here because this is not a form of its own.
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [basis, setBasis] = useState("air");
  // Results only while there is something to search for.
  const shown = q.trim().length >= 2 ? found : null;
  const kinds = CATEGORY_GROUPS.find((g) => g.key === zone)?.categories ?? [];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-accent bg-tile p-2">
      {step === "search" ? (
        <>
          <input
            ref={box}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={zone === "grip" ? "Search, e.g. Swix VP45" : "Search, e.g. Swix TS6"}
            aria-label="Search for a wax"
            className={small}
          />
          {shown && shown.length > 0 && (
            <ul className="flex flex-col gap-1">
              {shown.map((w) => (
                <li key={w.productId}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => finish(() => addLayerWax(w.productId))}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2 text-left text-sm active:bg-tile disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{w.label}</span>
                      <span className="block truncate text-xs text-muted">
                        {w.type}
                        {w.inBox ? " · in your box" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-link">{w.inBox ? "Use" : "Add & use"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {shown && shown.length === 0 && <p className="text-sm text-muted">Nothing found for &ldquo;{q.trim()}&rdquo;.</p>}
          <div className="flex flex-wrap gap-x-4">
            <button type="button" onClick={() => setStep("new")} className="inline-flex min-h-11 items-center text-sm text-link underline">
              Not listed? Add it
            </button>
            <button type="button" onClick={onType} className="inline-flex min-h-11 items-center text-sm text-link underline">
              Just type the name for this job
            </button>
            <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center text-sm text-muted underline">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Add a new wax to your box</p>
          <div className="grid grid-cols-2 gap-2">
            <label className={label}>
              Maker
              <input ref={box} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Swix" className={small} />
            </label>
            <label className={label}>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TS6 Turbo Blue" className={small} />
            </label>
          </div>
          <label className={label}>
            Type
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={small}>
              <option value="">Choose…</option>
              {kinds.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs font-medium">If the maker is new to the app, it rates its waxes by</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["air", "Air temperature"],
                ["snow", "Snow temperature"],
              ].map(([v, l]) => (
                <label key={v} className="flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:font-semibold">
                  <input type="radio" name={`basis-${zone}`} value={v} checked={basis === v} onChange={() => setBasis(v)} className="sr-only" />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted">Its temperature ranges, photo and iron temperature can be added later in the Wax box.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                finish(() => {
                  const f = new FormData();
                  f.set("brand", brand);
                  f.set("name", name);
                  f.set("category", category);
                  f.set("temperature_basis", basis);
                  f.set("layer_roles", "");
                  return quickAddLayerWax(zone, f);
                })
              }
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add & use"}
            </button>
            <button type="button" onClick={() => setStep("search")} className="inline-flex min-h-11 items-center text-sm text-link underline">
              Back to search
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
