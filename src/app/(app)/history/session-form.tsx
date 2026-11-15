"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useIsClient } from "@/components/use-is-client";
import type { SessionFormState } from "./actions";
import type { FormOptions } from "@/lib/history/load";
import { HUMIDITY_LABELS, LAYER_ROLE_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { HUMIDITY_BANDS, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { TECHNIQUES, TECHNIQUE_LABELS, type Technique } from "@/lib/skis/input";
import {
  KICK_FEELS,
  KICK_FEEL_LABELS,
  METHODS,
  METHOD_LABELS,
  MODES,
  MODE_LABELS,
  RATING_WORDS,
  SKIES,
  SKY_LABELS,
  TRACKS,
  TRACK_LABELS,
  ZONE_LABELS,
  ZONE_ROLES,
  type Zone,
} from "@/lib/history/vocab";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const section = "flex flex-col gap-4 rounded-xl border border-line bg-surface p-4";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

/** Finish steps offered as quick taps; anything else goes in the finish notes. */
const FINISH_TAGS = [
  "Brass/steel brush",
  "Nylon brush",
  "Horsehair brush",
  "Roto nylon",
  "Roto horsehair",
  "Roto cork",
  "Fibertex",
  "Polishing brush",
  "Rills",
];

const SNOWBALL: Record<string, string> = {
  dry: "Falls apart (dry, 0–25 %)",
  mid: "Loose ball (mid, 20–35 %)",
  wet: "Packs into a wet ball (wet, 30–100 %)",
};

export type LayerDraft = {
  key: number;
  zone: Zone;
  layer_role: string;
  user_product_id: string;
  custom_product: string;
  method: string;
  iron_temp_c: string;
  passes: string;
  scrape_brush_steps: string;
};

export type SessionInitial = {
  occurred_at: string; // ISO
  status: string;
  technique: Technique;
  ski_id: string | null;
  mode: string;
  venue_id: string | null;
  event_name: string | null;
  event_distance_km: number | null;
  event_result: string | null;
  finish_notes: string | null;
  finish_tags: string[];
  glide_rating: number | null;
  grip_rating: number | null;
  durability_rating: number | null;
  durability_km: number | null;
  durability_hours: number | null;
  kick_feel: string | null;
  notes: string | null;
  actual: Record<string, string | number | boolean | null> | null;
  layers: Omit<LayerDraft, "key">[];
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** An ISO moment as the value of a datetime-local field, in this browser's time zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let nextKey = 1;
const blankLayer = (zone: Zone, role = ""): LayerDraft => ({
  key: nextKey++,
  zone,
  layer_role: role,
  user_product_id: "",
  custom_product: "",
  method: zone === "glide" ? "iron" : "cork",
  iron_temp_c: "",
  passes: "",
  scrape_brush_steps: "",
});

export function SessionForm({
  options,
  save,
  initial,
  submitLabel,
  cancelHref,
}: {
  options: FormOptions;
  save: (prev: SessionFormState, data: FormData) => Promise<SessionFormState>;
  initial?: SessionInitial;
  submitLabel: string;
  /** Where Cancel goes: back to the session, or to History. */
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<SessionFormState, FormData>(save, {});
  const [technique, setTechnique] = useState<Technique | "">(initial?.technique ?? "");
  const [skiId, setSkiId] = useState(initial?.ski_id ?? "");
  const [mode, setMode] = useState(initial?.mode ?? "recreational");
  const [venue, setVenue] = useState(initial?.venue_id ?? "");
  const [tags, setTags] = useState<string[]>(initial?.finish_tags ?? []);
  const [layers, setLayers] = useState<LayerDraft[]>(() =>
    initial?.layers.length ? initial.layers.map((l) => ({ ...l, key: nextKey++ })) : [blankLayer("glide", "temperature")],
  );
  // The time and zone are set in the browser, after the first render, so the
  // page drawn on the server (which has no idea where you are) matches.
  const client = useIsClient();
  const [opened] = useState(() => new Date().toISOString());
  const [whenEdited, setWhen] = useState<string | null>(null);
  const when = whenEdited ?? (client ? toLocalInput(initial?.occurred_at ?? opened) : "");
  const tz = client ? String(new Date().getTimezoneOffset()) : "";

  const classic = technique === "classic";
  const shownLayers = classic ? layers : layers.filter((l) => l.zone === "glide");
  const skisForTechnique = useMemo(
    () => options.skis.filter((k) => !technique || k.technique === technique),
    [options.skis, technique],
  );
  const a = initial?.actual ?? {};
  const hasActual = Object.values(a).some((v) => v !== null && v !== "" && v !== true && v !== false);

  const update = (key: number, change: Partial<LayerDraft>) =>
    setLayers((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const move = (key: number, by: -1 | 1) =>
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.key === key);
      const j = i + by;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <form
      // Submitted by hand so a refused save keeps what was typed.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set(
          "layers",
          JSON.stringify(
            shownLayers.map((l) => {
              const { key, ...layer } = l;
              void key; // React's list key, not data
              return layer;
            }),
          ),
        );
        data.set("finish_tags", tags.join(", "));
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="tz_offset" value={tz} />

      <section className={section} aria-label="When and where">
        <div className="grid grid-cols-2 gap-2">
          {(["completed", "planned"] as const).map((st) => (
            <label key={st} className={choice}>
              <input type="radio" name="status" value={st} defaultChecked={(initial?.status ?? "completed") === st} className="sr-only" />
              {st === "completed" ? "Skied" : "Planned"}
            </label>
          ))}
        </div>
        <label className={label}>
          Date and time
          <input
            type="datetime-local"
            name="occurred_at"
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={field}
          />
        </label>
        <label className={label}>
          Venue
          <select name="venue_id" value={venue} onChange={(e) => setVenue(e.target.value)} className={field}>
            <option value="">Not set</option>
            {options.venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value="new">New venue…</option>
          </select>
        </label>
        {venue === "new" && (
          <input name="new_venue_name" placeholder="e.g. Lake Louise, Canmore Nordic Centre" aria-label="New venue name" className={field} />
        )}
      </section>

      <section className={section} aria-label="Skis and mode">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Technique</legend>
          <div className="grid grid-cols-2 gap-2">
            {TECHNIQUES.map((t) => (
              <label key={t} className={choice}>
                <input
                  type="radio"
                  name="technique"
                  value={t}
                  required
                  checked={technique === t}
                  onChange={() => {
                    setTechnique(t);
                    if (skiId && options.skis.find((k) => k.id === skiId)?.technique !== t) setSkiId("");
                  }}
                  className="sr-only"
                />
                {TECHNIQUE_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className={label}>
          Skis
          <select
            name="ski_id"
            value={skiId}
            onChange={(e) => {
              setSkiId(e.target.value);
              const ski = options.skis.find((k) => k.id === e.target.value);
              if (ski) setTechnique(ski.technique);
            }}
            className={field}
          >
            <option value="">Not set</option>
            {skisForTechnique.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <label key={m} className={choice}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {MODE_LABELS[m]}
            </label>
          ))}
        </div>
        {mode === "race" && (
          <div className="grid grid-cols-2 gap-3">
            <label className={`${label} col-span-2`}>
              Event
              <input name="event_name" defaultValue={s(initial?.event_name)} placeholder="e.g. Canmore Loppet" className={field} />
            </label>
            <label className={label}>
              Distance, km
              <input name="event_distance_km" inputMode="decimal" defaultValue={s(initial?.event_distance_km)} className={field} />
            </label>
            <label className={label}>
              Result
              <input name="event_result" defaultValue={s(initial?.event_result)} placeholder="e.g. 12th, 1:24:30" className={field} />
            </label>
          </div>
        )}
      </section>

      <section className={section} aria-label="Layers">
        <h2 className="font-semibold">What went on the skis</h2>
        {shownLayers.length === 0 && <p className="text-sm text-muted">No layers yet.</p>}
        <ol className="flex flex-col gap-3">
          {shownLayers.map((l, i) => (
            <LayerRow
              key={l.key}
              n={i + 1}
              layer={l}
              options={options}
              first={i === 0}
              last={i === shownLayers.length - 1}
              onChange={(c) => update(l.key, c)}
              onMove={(by) => move(l.key, by)}
              onRemove={() => setLayers((ls) => ls.filter((x) => x.key !== l.key))}
            />
          ))}
        </ol>
        <div className={`grid gap-2 ${classic ? "grid-cols-2" : "grid-cols-1"}`}>
          <button type="button" onClick={() => setLayers((ls) => [...ls, blankLayer("glide")])} className="min-h-11 rounded-lg border border-line px-3 text-sm active:bg-tile">
            + Glide layer
          </button>
          {classic && (
            <button type="button" onClick={() => setLayers((ls) => [...ls, blankLayer("grip", "kick")])} className="min-h-11 rounded-lg border border-line px-3 text-sm active:bg-tile">
              + Grip layer
            </button>
          )}
        </div>
        {options.waxes.length === 0 && (
          <p className="text-sm text-muted">Your wax box is empty, so type each wax&apos;s name. Waxes added to the box can be picked here.</p>
        )}
      </section>

      <section className={section} aria-label="Finish">
        <h2 className="font-semibold">Finish</h2>
        <div className="flex flex-wrap gap-2">
          {FINISH_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTags((ts) => (on ? ts.filter((x) => x !== t) : [...ts, t]))}
                className={`min-h-11 rounded-full border px-3 text-sm ${on ? "border-accent bg-tile font-semibold" : "border-line"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <label className={label}>
          Finish notes
          <textarea name="finish_notes" rows={2} defaultValue={s(initial?.finish_notes)} placeholder="Order, passes, rill tool and insert…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base" />
        </label>
      </section>

      <details className={section} open={hasActual || undefined}>
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Actual conditions</summary>
        <p className="text-sm text-muted">What the snow was really like, so the history can match it to future days.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Snow temp, °C
            <input name="snow_temp_c" inputMode="decimal" defaultValue={s(a.snow_temp_c)} placeholder="e.g. -6" className={field} />
          </label>
          <label className={label}>
            Air temp, °C
            <input name="air_temp_c" inputMode="decimal" defaultValue={s(a.air_temp_c)} placeholder="e.g. -4" className={field} />
          </label>
          <label className={label}>
            Air humidity, %
            <input name="air_rh_pct" inputMode="numeric" defaultValue={s(a.air_rh_pct)} placeholder="e.g. 70" className={field} />
          </label>
          <label className={label}>
            New snow, cm
            <input name="new_snow_cm" inputMode="decimal" defaultValue={s(a.new_snow_cm)} className={field} />
          </label>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Snowball test</legend>
          <div className="grid gap-2">
            {HUMIDITY_BANDS.map((b) => (
              <label key={b} className={choice}>
                <input type="radio" name="snow_humidity_band" value={b} defaultChecked={a.snow_humidity_band === b} className="sr-only" />
                {SNOWBALL[b] ?? HUMIDITY_LABELS[b]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className={label}>
          Snow type
          <select name="snow_type" defaultValue={s(a.snow_type)} className={field}>
            <option value="">Not set</option>
            {SNOW_TYPES.map((t) => (
              <option key={t} value={t}>
                {SNOW_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Sky
            <select name="sky" defaultValue={s(a.sky)} className={field}>
              <option value="">Not set</option>
              {SKIES.map((t) => (
                <option key={t} value={t}>
                  {SKY_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Track
            <select name="track" defaultValue={s(a.track)} className={field}>
              <option value="">Not set</option>
              {TRACKS.map((t) => (
                <option key={t} value={t}>
                  {TRACK_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Wind, km/h
            <input name="wind_kmh" inputMode="decimal" defaultValue={s(a.wind_kmh)} className={field} />
          </label>
        </div>
      </details>

      <section className={section} aria-label="How it went">
        <h2 className="font-semibold">How it went</h2>
        <Rating name="glide_rating" legend="Glide" initial={initial?.glide_rating} />
        {classic && <Rating name="grip_rating" legend="Grip" initial={initial?.grip_rating} />}
        {classic && (
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">Kick</legend>
            <div className="grid grid-cols-3 gap-2">
              {KICK_FEELS.map((k) => (
                <label key={k} className={choice}>
                  <input type="radio" name="kick_feel" value={k} defaultChecked={initial?.kick_feel === k} className="sr-only" />
                  {KICK_FEEL_LABELS[k]}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <Rating name="durability_rating" legend="Durability" initial={initial?.durability_rating} />
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Lasted, km
            <input name="durability_km" inputMode="decimal" defaultValue={s(initial?.durability_km)} className={field} />
          </label>
          <label className={label}>
            Lasted, hours
            <input name="durability_hours" inputMode="decimal" defaultValue={s(initial?.durability_hours)} className={field} />
          </label>
        </div>
        <label className={label}>
          Notes
          <textarea name="notes" rows={3} defaultValue={s(initial?.notes)} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base" />
        </label>
      </section>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {/* Leaving saves nothing: a repeated prep or a new session only exists once saved. */}
        <Link
          href={cancelHref}
          className="flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold active:bg-tile"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Rating({ name, legend, initial }: { name: string; legend: string; initial?: number | null }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-6 gap-1">
        <label className={choice}>
          <input type="radio" name={name} value="" defaultChecked={!initial} className="sr-only" />–
        </label>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={choice} title={RATING_WORDS[n]}>
            <input type="radio" name={name} value={n} defaultChecked={initial === n} className="sr-only" />
            {n}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LayerRow({
  n,
  layer,
  options,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  n: number;
  layer: LayerDraft;
  options: FormOptions;
  first: boolean;
  last: boolean;
  onChange: (c: Partial<LayerDraft>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  // Waxes from the zone's part of the box first; cleaners and the rest after.
  const own = options.waxes.filter((w) => w.group === layer.zone);
  const other = options.waxes.filter((w) => w.group !== layer.zone);
  const typed = layer.user_product_id === "" && options.waxes.length > 0 ? layer.custom_product !== "" : true;
  const [typing, setTyping] = useState(typed || options.waxes.length === 0);
  const small = "min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-sm";

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {n}. {ZONE_LABELS[layer.zone]}
        </p>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label={`Move layer ${n} up`} className="size-11 rounded-lg border border-line disabled:opacity-30">
            ↑
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={last} aria-label={`Move layer ${n} down`} className="size-11 rounded-lg border border-line disabled:opacity-30">
            ↓
          </button>
          <button type="button" onClick={onRemove} aria-label={`Remove layer ${n}`} className="size-11 rounded-lg border border-line text-danger">
            ✕
          </button>
        </div>
      </div>
      <select value={layer.layer_role} onChange={(e) => onChange({ layer_role: e.target.value })} aria-label={`Layer ${n} role`} className={small}>
        <option value="">Role…</option>
        {ZONE_ROLES[layer.zone].map((r) => (
          <option key={r} value={r}>
            {LAYER_ROLE_LABELS[r as keyof typeof LAYER_ROLE_LABELS]}
          </option>
        ))}
      </select>
      {typing ? (
        <div className="flex gap-2">
          <input
            value={layer.custom_product}
            onChange={(e) => onChange({ custom_product: e.target.value, user_product_id: "" })}
            placeholder="Wax, e.g. Swix TS6"
            aria-label={`Layer ${n} wax`}
            className={small}
          />
          {options.waxes.length > 0 && (
            <button type="button" onClick={() => setTyping(false)} className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-sm">
              Pick
            </button>
          )}
        </div>
      ) : (
        <select
          value={layer.user_product_id}
          onChange={(e) => {
            if (e.target.value === "__type") {
              setTyping(true);
              onChange({ user_product_id: "" });
              return;
            }
            const wax = options.waxes.find((w) => w.id === e.target.value);
            onChange({
              user_product_id: e.target.value,
              custom_product: "",
              iron_temp_c: layer.iron_temp_c || (wax?.iron_temp_c ? String(wax.iron_temp_c) : ""),
            });
          }}
          aria-label={`Layer ${n} wax`}
          className={small}
        >
          <option value="">Wax from your box…</option>
          {own.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
          {other.length > 0 && (
            <optgroup label="Other items">
              {other.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </optgroup>
          )}
          <option value="__type">Not in my box — type it…</option>
        </select>
      )}
      <div className="grid grid-cols-3 gap-2">
        <select value={layer.method} onChange={(e) => onChange({ method: e.target.value })} aria-label={`Layer ${n} method`} className={small}>
          <option value="">Method…</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
        <input
          value={layer.iron_temp_c}
          onChange={(e) => onChange({ iron_temp_c: e.target.value })}
          inputMode="numeric"
          placeholder="Iron °C"
          aria-label={`Layer ${n} iron temperature`}
          disabled={layer.method !== "iron"}
          className={`${small} disabled:opacity-40`}
        />
        <input
          value={layer.passes}
          onChange={(e) => onChange({ passes: e.target.value })}
          inputMode="numeric"
          placeholder={layer.zone === "grip" ? "Layers" : "Passes"}
          aria-label={`Layer ${n} passes`}
          className={small}
        />
      </div>
      <input
        value={layer.scrape_brush_steps}
        onChange={(e) => onChange({ scrape_brush_steps: e.target.value })}
        placeholder={layer.zone === "grip" ? "e.g. corked between layers, 10 min outside" : "e.g. cooled 15 min, scraped, brass + nylon"}
        aria-label={`Layer ${n} scraping and brushing`}
        className={small}
      />
    </li>
  );
}
