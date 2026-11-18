"use client";

import { AddLayerWax } from "./add-layer-wax";
import { ironForWax } from "@/lib/history/iron";
import { startTransition, useActionState, useMemo, useState } from "react";
import { BackLink } from "@/components/nav-trail";
import { useIsClient } from "@/components/use-is-client";
import type { SessionFormState } from "./actions";
import type { FormOptions, WaxOption } from "@/lib/history/load";
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
  DEBRIS,
  DEBRIS_LABELS,
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
  technique: Technique | "";
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
  hidden,
  onWhereWhen,
}: {
  options: FormOptions;
  save: (prev: SessionFormState, data: FormData) => Promise<SessionFormState>;
  initial?: SessionInitial;
  submitLabel: string;
  /** Where Cancel goes when the page was opened directly; otherwise it returns to the page the person came from. */
  cancelHref: string;
  /** Extra fields sent with the form, e.g. the forecast "Record today's wax" saves. */
  hidden?: Record<string, string>;
  /** Told the venue and the moment (ISO, or null while the time is incomplete) whenever either changes. */
  onWhereWhen?: (venueId: string, at: string | null) => void;
}) {
  const [state, action, pending] = useActionState<SessionFormState, FormData>(save, {});
  // Waxes added from a layer (Add a wax…) join the box's list for every layer at once.
  const [addedWaxes, setAddedWaxes] = useState<WaxOption[]>([]);
  const allOptions: FormOptions = {
    ...options,
    waxes: [...options.waxes, ...addedWaxes.filter((a) => !options.waxes.some((w) => w.id === a.id))].sort((a, b) => a.label.localeCompare(b.label)),
  };
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
  // Record a wax job (record=1): waxing done before skiing, so no rating here.
  const recording = hidden?.record === "1";
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
      // The server checks every field and says what is missing beside Save.
      // The browser's own check is off: Classic/Skate are visually hidden
      // radios, so on iPad a missing technique blocked Save with no message.
      noValidate
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
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      <section className={section} aria-label="When and where">
        {/* No Skied / Planned switch: a session counts as done once it is rated
            (statusFor). The previous status rides along so an older, unrated
            session that was already done stays done. */}
        {initial?.status && <input type="hidden" name="status" value={initial.status} />}
        <label className={label}>
          Date and time
          <input
            type="datetime-local"
            name="occurred_at"
            required
            value={when}
            onChange={(e) => {
              setWhen(e.target.value);
              onWhereWhen?.(venue, momentOf(e.target.value));
            }}
            className={field}
          />
        </label>
        <label className={label}>
          Venue
          <select name="venue_id" value={venue} onChange={(e) => {
              setVenue(e.target.value);
              onWhereWhen?.(e.target.value, momentOf(when));
            }} className={field}>
            <option value="">Not set</option>
            {options.venues.filter((v) => !v.hidden || v.id === initial?.venue_id).map((v) => (
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
              options={allOptions}
              onWaxAdded={(w) => setAddedWaxes((ws) => (ws.some((x) => x.id === w.id) ? ws : [...ws, w]))}
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
        {allOptions.waxes.length === 0 && (
          <p className="text-sm text-muted">Your wax box is empty: choose Add a wax… in a layer to find a wax and put it in your box as you go.</p>
        )}
      </section>

      <section className={section} aria-label="Glide Finish">
        <h2 className="font-semibold">Glide Finish</h2>
        <div className="flex flex-wrap gap-2">
          {/* Each tap adds the step to the end of the sequence, so a step can
              come more than once (brass, nylon, brass…). Undo and Clear below
              take steps back out. */}
          {FINISH_TAGS.map((t) => {
            const times = tags.filter((x) => x === t).length;
            return (
              <button
                key={t}
                type="button"
                aria-label={times ? `${t}, used ${times} ${times === 1 ? "time" : "times"}; add again` : `Add ${t}`}
                onClick={() => setTags((ts) => [...ts, t])}
                className={`min-h-11 rounded-full border px-3 text-sm ${times ? "border-accent bg-tile font-semibold" : "border-line"}`}
              >
                {t}
                {times > 1 ? ` ×${times}` : ""}
              </button>
            );
          })}
        </div>
        {/* The tapped steps, in the order tapped (the order they are saved
            in, and shown on the session page), with Undo last and Clear.
            Above the notes but outside their label: a button inside it would
            become the label's control, and tapping "Finish notes" would Undo. */}
        {tags.length > 0 && (
          <div className="-mb-2 flex flex-wrap items-center gap-x-3 rounded-lg bg-tile px-3 py-1 text-sm">
            <span aria-live="polite" className="min-w-0 flex-1 py-1">
              {tags.join(" → ")}
            </span>
            <span className="flex shrink-0 gap-3">
              <button type="button" onClick={() => setTags((ts) => ts.slice(0, -1))} className="min-h-11 text-link underline">
                Undo last
              </button>
              <button type="button" onClick={() => setTags([])} className="min-h-11 text-link underline">
                Clear
              </button>
            </span>
          </div>
        )}
        <label className={label}>
          Finish notes
          <textarea name="finish_notes" rows={2} defaultValue={s(initial?.finish_notes)} placeholder="Order, passes, rill tool and insert…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base" />
        </label>
      </section>

      <details className={section} open={hasActual || undefined}>
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Actual Conditions on the day</summary>
        <p className="text-sm text-muted">Describe the actual snow conditions so they can be matched to similar days in your History.</p>
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
          {/* Beside wind: needles, leaves or dirt on the track slow a ski and wear the wax. */}
          <label className={label}>
            Debris
            <select name="debris" defaultValue={s(a.debris)} className={field}>
              <option value="">Not set</option>
              {DEBRIS.map((d) => (
                <option key={d} value={d}>
                  {DEBRIS_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      {/* Recording a wax job is done before skiing: rating comes later, on the
          session's own page (the rating step), so the form asks nothing of it. */}
      {!recording && (
      <section className={section} aria-label="How it went">
        <h2 className="font-semibold">How it went</h2>
        <p className="-mt-2 text-sm text-muted">Any rating marks the session as done.</p>
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
      )}

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {/* Leaving saves nothing: a repeated prep or a new session only exists once saved. */}
        <BackLink fallback={cancelHref} className="flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold active:bg-tile">
          Cancel
        </BackLink>
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
  onWaxAdded,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  n: number;
  layer: LayerDraft;
  options: FormOptions;
  onWaxAdded: (w: WaxOption) => void;
  first: boolean;
  last: boolean;
  onChange: (c: Partial<LayerDraft>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  // Only the waxes for this layer's zone: glide waxes on a glide layer, grip
  // waxes on a grip layer. A skate ski has only glide layers, so it never
  // offers a kick wax. Cleaners and consumables follow, for cleaning layers;
  // the other zone's waxes are never offered (the owner's call).
  const own = options.waxes.filter((w) => w.group === layer.zone);
  const other = options.waxes.filter((w) => w.group === "solvent" || w.group === "consumable");
  // A wax typed by name (custom_product) opens as typed; otherwise the pull-down, even with an empty box (Add a wax… is in it).
  const typed = layer.user_product_id === "" && layer.custom_product !== "";
  const [typing, setTyping] = useState(typed);
  // Add a wax…: search the catalogue or add a new one, without leaving the job.
  const [adding, setAdding] = useState(false);
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
      {adding ? (
        <AddLayerWax
          zone={layer.zone}
          onAdded={(w) => {
            onWaxAdded(w);
            setAdding(false);
            setTyping(false);
            const before = options.waxes.find((x) => x.id === layer.user_product_id);
            onChange({ user_product_id: w.id, custom_product: "", iron_temp_c: ironForWax(layer.iron_temp_c, before, w) });
          }}
          onType={() => {
            setAdding(false);
            setTyping(true);
            onChange({ user_product_id: "" });
          }}
          onCancel={() => setAdding(false)}
        />
      ) : typing ? (
        <div className="flex gap-2">
          <input
            value={layer.custom_product}
            onChange={(e) => onChange({ custom_product: e.target.value, user_product_id: "" })}
            placeholder="Wax, e.g. Swix TS6"
            aria-label={`Layer ${n} wax`}
            className={small}
          />
          <button type="button" onClick={() => setTyping(false)} className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-sm">
            Pick
          </button>
        </div>
      ) : (
        <select
          value={layer.user_product_id}
          onChange={(e) => {
            if (e.target.value === "__add") {
              setAdding(true);
              return;
            }
            const wax = options.waxes.find((w) => w.id === e.target.value);
            onChange({
              user_product_id: e.target.value,
              custom_product: "",
              iron_temp_c: ironForWax(layer.iron_temp_c, options.waxes.find((x) => x.id === layer.user_product_id), wax),
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
            <optgroup label="Cleaners and consumables">
              {other.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </optgroup>
          )}
          <option value="__add">Add a wax…</option>
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

/** A datetime-local value (the browser's own clock) as a moment, or null while it is incomplete. */
function momentOf(local: string): string | null {
  const t = new Date(local);
  return local && !Number.isNaN(t.getTime()) ? t.toISOString() : null;
}
