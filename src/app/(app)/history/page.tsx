import { BackLink } from "@/components/nav-trail";
import { Suspense } from "react";
import { SkierBanner } from "@/components/skier-banner";
import { loadSkierContext } from "@/lib/skiers/current";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { HUMIDITY_BANDS, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { TECHNIQUES, TECHNIQUE_LABELS } from "@/lib/skis/input";
import {
  activeCount,
  parseFilters,
  recentSeasons,
  seasonLabel,
  toQuery,
  type Filters,
  type Sort,
} from "@/lib/history/filters";
import { KICK_FEELS, KICK_FEEL_LABELS, MODES, MODE_LABELS, STATUSES, STATUS_LABELS } from "@/lib/history/vocab";
import { LocalTime } from "@/components/local-time";
import { historyQuery } from "@/lib/history/query";
import { ExportLink } from "@/components/history/export-link";
import { deleteFilter, saveFilter } from "./actions";
import { SaveFilterForm } from "./save-filter-form";
import { SimilarOption } from "./similar-option";
import { ConfirmDelete } from "@/components/confirm-delete";
import { forecastable, loadVenues } from "@/lib/venues/load";
import { loadTodayVenue } from "@/lib/venues/today-load";
import { forecastFor } from "@/lib/weather/window";
import { similarQuery } from "@/lib/history/similar";

export const metadata: Metadata = { title: "History · My Wax Planner" };

type Row = {
  id: string;
  occurred_at: string;
  status: "planned" | "completed";
  technique: "classic" | "skate";
  mode: "recreational" | "race";
  skier_name: string | null;
  ski_name: string | null;
  venue_name: string | null;
  event_name: string | null;
  glide_rating: number | null;
  grip_rating: number | null;
  kick_feel: keyof typeof KICK_FEEL_LABELS | null;
  snow_temp_c: number | null;
  air_temp_c: number | null;
  snow_type: keyof typeof SNOW_TYPE_LABELS | null;
  snow_humidity_band: keyof typeof HUMIDITY_LABELS | null;
  waxes: string;
  fluoro_free: boolean;
};

const SORT_LABELS: Record<Sort, string> = {
  date: "Newest first",
  glide: "Best glide",
  grip: "Best grip",
  snow_temp: "Coldest snow",
};

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const deg = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C";

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      {/* A tab, but still reached from somewhere: back to the page you came from, else Today. */}
      <BackLink fallback="/" fallbackLabel="Today" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">History</h1>
      {/* Looking back only: a new session starts on the Session tab (Plan a wax session, or Record a wax job). */}
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <History searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function History({ searchParams }: { searchParams: PageProps<"/history">["searchParams"] }) {
  const f = parseFilters(await searchParams);
  const supabase = await createClient();
  const now = new Date();
  // No skier in the address means the one picked on Today.
  const who = await loadSkierContext();
  const skier = f.skier ?? (who.skiers.length > 0 ? who.key : undefined);

  const query = historyQuery(
    supabase,
    "id, occurred_at, status, technique, mode, skier_name, ski_name, venue_name, event_name, glide_rating, grip_rating, kick_feel, snow_temp_c, air_temp_c, snow_type, snow_humidity_band, waxes, fluoro_free",
    f,
    skier,
    now,
    who.seasonStart,
  ).limit(300);

  const [list, skis, skiers, venues, brands, saved] = await Promise.all([
    query,
    supabase.from("skis").select("id, name").order("name"),
    supabase.from("skiers").select("id, name").order("name"),
    supabase.from("venues").select("id, name").order("name"),
    supabase.from("wax_session_list").select("brand_names"),
    supabase.from("saved_filters").select("id, name, query").order("name"),
  ]);
  if (list.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not read your history: {list.error.message}
      </p>
    );
  }
  const rows = (list.data ?? []) as unknown as Row[];
  const brandNames = [...new Set((brands.data ?? []).flatMap((b) => b.brand_names as string[]))].sort();
  const skiName = new Map((skis.data ?? []).map((k) => [k.id as string, k.name as string]));
  const venueName = new Map((venues.data ?? []).map((v) => [v.id as string, v.name as string]));
  const n = activeCount(f);
  const here = toQuery(f);

  type Chip = { field: string; label: string; without: Partial<Filters> };
  const chips = (
    [
    f.technique && { field: "Technique", label: TECHNIQUE_LABELS[f.technique as "classic"], without: { technique: undefined } },
    f.skier && {
      field: "Skier",
      label:
        f.skier === "me"
          ? `${who.me}'s skis`
          : f.skier === "all"
            ? "Everyone's skis"
            : `${(skiers.data ?? []).find((k) => k.id === f.skier)?.name ?? "Skier"}'s skis`,
      without: { skier: undefined },
    },
    f.ski && { field: "Skis", label: skiName.get(f.ski) ?? "Skis", without: { ski: undefined } },
    f.venue && { field: "Venue", label: venueName.get(f.venue) ?? "Venue", without: { venue: undefined } },
    f.mode && { field: "Kind", label: MODE_LABELS[f.mode as "race"], without: { mode: undefined } },
    f.status && { field: "Status", label: STATUS_LABELS[f.status as "planned"], without: { status: undefined } },
    (f.tmin !== undefined || f.tmax !== undefined) && {
      field: "Snow temperature",
      label: `${f.tmax !== undefined ? deg(f.tmax) : "…"} to ${f.tmin !== undefined ? deg(f.tmin) : "…"}`,
      without: { tmin: undefined, tmax: undefined },
    },
    f.snow && { field: "Snow type", label: SNOW_TYPE_LABELS[f.snow as "wet"], without: { snow: undefined } },
    f.snowhum && { field: "Snow humidity", label: HUMIDITY_LABELS[f.snowhum as "dry"], without: { snowhum: undefined } },
    f.airhum && { field: "Air humidity", label: HUMIDITY_LABELS[f.airhum as "dry"], without: { airhum: undefined } },
    f.brand && { field: "Brand", label: f.brand, without: { brand: undefined } },
    f.product && { field: "Wax", label: "One wax", without: { product: undefined } },
    f.glide && { field: "Glide", label: `${f.glide} or better`, without: { glide: undefined } },
    f.grip && { field: "Grip", label: `${f.grip} or better`, without: { grip: undefined } },
    f.kick && { field: "Kick", label: KICK_FEEL_LABELS[f.kick as "good"], without: { kick: undefined } },
    f.q && { field: "Search", label: `“${f.q}”`, without: { q: undefined } },
    ] as (Chip | false | "" | 0 | undefined)[]
  ).filter((c): c is Chip => Boolean(c));

  const periodLabel = (p: string) =>
    p === "season" ? "This season" : p === "30d" ? "Last 30 days" : p === "all" ? "All time" : `Season ${seasonLabel(p, who.seasonStart)}`;

  // The card always says whose sessions and which skis, even when they come
  // from the skier picked on Today rather than from the filter itself.
  const skierName =
    skier === undefined || skier === "all"
      ? null
      : skier === "me"
        ? who.me
        : ((skiers.data ?? []).find((k) => k.id === skier)?.name ?? null);
  const summaryRows = [
    ...(chips.some((c) => c.field === "Skier") || !skierName ? [] : [{ field: "Skier", label: skierName }]),
    ...(chips.some((c) => c.field === "Skis") ? [] : [{ field: "Skis", label: "All pairs" }]),
    ...chips,
  ];

  const savedList = (saved.data ?? []) as { id: string; name: string; query: string }[];
  // The saved filter the page is showing now, if any.
  const active = savedList.find((sf) => here === `?${sf.query}`) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <SkierBanner returnTo={`/history${toQuery(f, { skier: undefined })}`} everyone={skier === "all"} override={f.skier && f.skier !== "all" ? (f.skier === "me" ? who.me : (skiers.data ?? []).find((k) => k.id === f.skier)?.name ?? null) : null} />
      <nav aria-label="Period" className="flex gap-1 overflow-x-auto rounded-xl bg-tile p-1">
        {["season", "30d", "all"].map((p) => (
          <Link
            key={p}
            href={`/history${toQuery(f, { period: p })}`}
            aria-current={f.period === p ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm ${f.period === p ? "bg-surface font-semibold shadow-sm" : "text-muted"}`}
          >
            {periodLabel(p)}
          </Link>
        ))}
      </nav>

      {/* Folded after applying: the chips below show what is active. */}
      <details className="rounded-xl border border-line bg-surface">
        {/* No justify-between: on iPad the fold's triangle is a flex item too,
            and spreading the items pushed "Filter" away from it. */}
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 font-semibold">
          <span>Filter{n > 0 ? ` (${n})` : ""}</span>
          {/* On the fold itself, so clearing needs no opening first. */}
          {n > 0 && (
            <Link href="/history" className="ml-auto inline-flex min-h-11 items-center px-1 text-sm font-normal text-link underline">
              Clear
            </Link>
          )}
        </summary>
        {/* A plain GET form: the filters become the page address, so the back
            button, bookmarks and saved filters all just work. */}
        <form method="get" action="/history" className="flex flex-col gap-3 p-4 pt-0">
          {f.sort !== "date" && <input type="hidden" name="sort" value={f.sort} />}
          {/* Its own boundary: it waits on the forecast, the rest of the fold does not. */}
          <Suspense fallback={null}>
            <SimilarToday f={f} />
          </Suspense>
          <label className={label}>
            Period
            <select name="period" defaultValue={f.period} className={field}>
              <option value="season">This season</option>
              <option value="30d">Last 30 days</option>
              {recentSeasons(now, 5, who.seasonStart).slice(1).map((s) => (
                <option key={s} value={s}>
                  {periodLabel(s)}
                </option>
              ))}
              <option value="all">All time</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Select name="technique" label="Technique" value={f.technique} options={TECHNIQUES.map((t) => [t, TECHNIQUE_LABELS[t]])} />
            <Select name="mode" label="Mode" value={f.mode} options={MODES.map((m) => [m, MODE_LABELS[m]])} />
            {(skiers.data ?? []).length > 0 && (
              <div className="col-span-2">
                <Select
                  name="skier"
                  label="Whose skis"
                  value={f.skier}
                  anyLabel={`${who.current?.name ?? who.me} (who you're waxing for)`}
                  options={[["all", "Everyone"], ["me", who.me], ...(skiers.data ?? []).map((k): [string, string] => [k.id, k.name])]}
                />
              </div>
            )}
            <Select name="ski" label="Skis" value={f.ski} options={(skis.data ?? []).map((k) => [k.id, k.name])} />
            <Select name="venue" label="Venue" value={f.venue} options={(venues.data ?? []).map((v) => [v.id, v.name])} />
            <label className={label}>
              Snow from, °C
              <input name="tmin" inputMode="numeric" defaultValue={f.tmin ?? ""} placeholder="e.g. -10" className={field} />
            </label>
            <label className={label}>
              to, °C
              <input name="tmax" inputMode="numeric" defaultValue={f.tmax ?? ""} placeholder="e.g. -5" className={field} />
            </label>
            <Select name="snowhum" label="Snow humidity" value={f.snowhum} options={HUMIDITY_BANDS.map((b) => [b, HUMIDITY_LABELS[b]])} />
            <Select name="airhum" label="Air humidity" value={f.airhum} options={HUMIDITY_BANDS.map((b) => [b, HUMIDITY_LABELS[b]])} />
            <div className="col-span-2">
              <Select name="snow" label="Snow type" value={f.snow} options={SNOW_TYPES.map((t) => [t, SNOW_TYPE_LABELS[t]])} />
            </div>
            <Select name="brand" label="Brand used" value={f.brand} options={brandNames.map((b) => [b, b])} />
            <Select name="status" label="Status" value={f.status} options={STATUSES.map((s) => [s, STATUS_LABELS[s]])} />
            <Select name="glide" label="Glide at least" value={f.glide?.toString()} options={[1, 2, 3, 4, 5].map((r) => [String(r), String(r)])} />
            <Select name="grip" label="Grip at least" value={f.grip?.toString()} options={[1, 2, 3, 4, 5].map((r) => [String(r), String(r)])} />
            <div className="col-span-2">
              <Select name="kick" label="Kick" value={f.kick} options={KICK_FEELS.map((k) => [k, KICK_FEEL_LABELS[k]])} />
            </div>
          </div>
          {f.product && <input type="hidden" name="product" value={f.product} />}
          <label className={label}>
            Search notes, events and waxes
            <input name="q" type="search" defaultValue={f.q ?? ""} className={field} />
          </label>
          {/* A full page load, so the fold closes and the active filters show below it. */}
          <button type="submit" className="min-h-11 rounded-lg bg-accent font-semibold text-on-accent active:opacity-70">
            Apply Filter
          </button>
        </form>
      </details>

      {/* Saved filters: a pick list under the Filter fold. Tapping one applies
          it; tapping the one in use turns it off. The current filter can be
          saved from here too. */}
      <details className="rounded-xl border border-line bg-surface">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 font-semibold">
          Saved filters
          <span className="truncate font-normal text-muted">
            {active ? `· ${active.name}` : ""}
          </span>
        </summary>
        <div className="flex flex-col gap-3 p-4 pt-0">
          {savedList.length === 0 ? (
            <p className="text-sm text-muted">None yet. Set a filter above, then save it here to use it again with one tap.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {savedList.map((sf) => {
                const on = active?.id === sf.id;
                return (
                  <li key={sf.id} className="flex items-center gap-1">
                    <Link
                      href={on ? "/history" : `/history?${sf.query}`}
                      aria-current={on ? "true" : undefined}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-3 active:bg-tile"
                    >
                      <span
                        aria-hidden
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${on ? "border-accent bg-accent text-on-accent" : "border-line"}`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className={`min-w-0 flex-1 truncate ${on ? "font-semibold" : ""}`}>{sf.name}</span>
                      {on && <span className="shrink-0 text-sm text-link underline">Turn off</span>}
                    </Link>
                    <ConfirmDelete action={deleteFilter.bind(null, sf.id)} label={`saved filter ${sf.name}`} />
                  </li>
                );
              })}
            </ul>
          )}
          {n > 0 && !active && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <h2 className="text-sm font-semibold">Save the current filter</h2>
              <SaveFilterForm save={saveFilter.bind(null, here)} />
            </div>
          )}
        </div>
      </details>

      {/* What the list is filtered by: a plain, compact summary. Changing or
          clearing it happens on the Filter fold above. */}
      {chips.length > 0 && (
        <section aria-label="Active filters" className="rounded-xl border border-line bg-surface px-4 py-3">
          <h2 className="mb-1 text-sm font-semibold">{active ? `Saved filter: ${active.name}` : "Filtered by"}</h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 text-sm">
            {summaryRows.map((c) => (
              <div key={c.field} className="contents">
                <dt className="text-muted">{c.field}</dt>
                <dd className="truncate">{c.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* The list itself is one tap away, so the filters and their summary
          stay at the top of a short page. */}
      <details className="group">
        <summary className="list-none flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70">
          <span className="group-open:hidden">
            Show sessions ({rows.length})
          </span>
          <span className="hidden group-open:inline">Hide sessions</span>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
        {/* The count is on the Show sessions button; only the sort is needed here. */}
        <div className="flex items-center gap-3 text-sm">
          <nav aria-label="Sort" className="flex flex-wrap gap-x-3">
            {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
              <Link
                key={s}
                href={`/history${toQuery(f, { sort: s })}`}
                aria-current={f.sort === s ? "true" : undefined}
                className={`inline-flex min-h-11 items-center ${f.sort === s ? "font-semibold" : "text-link underline"}`}
              >
                {SORT_LABELS[s]}
              </Link>
            ))}
          </nav>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-muted">
            {n > 0 || f.period !== "all"
              ? "No sessions match. Try fewer filters or a longer period."
              : "No sessions yet. Log each time you wax and ski; after a few, the filters turn this into your own wax chart."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <SessionRow key={r.id} row={r} />
            ))}
          </ul>
        )}
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <Link href="/history/compare" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-medium active:bg-tile">
          Compare sessions
        </Link>
        <Link href="/history/insights" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-medium active:bg-tile">
          Insights
        </Link>
        {rows.length > 0 && <ExportLink href={`/history/export${toQuery(f, { skier })}`} />}
      </div>
    </div>
  );
}

function Select({
  name,
  label: text,
  value,
  options,
  anyLabel = "Any",
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
  anyLabel?: string;
}) {
  return (
    <label className={label}>
      {text}
      <select name={name} defaultValue={value ?? ""} className={field}>
        <option value="">{anyLabel}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function SessionRow({ row: r }: { row: Row }) {
  const conditions = [
    r.snow_temp_c !== null ? `Snow ${deg(r.snow_temp_c)}` : r.air_temp_c !== null ? `Air ${deg(r.air_temp_c)}` : null,
    r.snow_type ? SNOW_TYPE_LABELS[r.snow_type].split(/[,/]/)[0].trim() : null,
    r.snow_humidity_band ? `${HUMIDITY_LABELS[r.snow_humidity_band].toLowerCase()} snow` : null,
  ].filter(Boolean);

  return (
    <li>
      <Link href={`/history/${r.id}`} className="block rounded-xl border border-line bg-surface p-3 active:bg-tile">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">
              <LocalTime iso={r.occurred_at} format="date" />
              {r.status === "planned" && <span className="ml-2 rounded-full bg-tile px-2 text-xs">In Progress</span>}
            </p>
            <p className="truncate font-medium">
              {r.event_name ?? r.venue_name ?? "Session"}
              <span className="font-normal text-muted"> · {TECHNIQUE_LABELS[r.technique]}{r.mode === "race" ? " race" : ""}</span>
            </p>
            {(r.skier_name || r.ski_name) && (
              <p className="truncate text-sm text-muted">
                {[r.skier_name, r.ski_name].filter(Boolean).join(" · ")}
              </p>
            )}
            {conditions.length > 0 && <p className="text-sm">{conditions.join(" · ")}</p>}
            {r.waxes && <p className="truncate text-sm text-muted">{r.waxes}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
            {r.glide_rating && <span className="rounded-full bg-tile px-2 py-0.5">Glide {r.glide_rating}</span>}
            {r.grip_rating && <span className="rounded-full bg-tile px-2 py-0.5">Grip {r.grip_rating}</span>}
            {r.kick_feel && r.kick_feel !== "good" && (
              <span className="rounded-full bg-tile px-2 py-0.5 text-danger">{KICK_FEEL_LABELS[r.kick_feel]}</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * "Days similar to today", the first choice in the Filter fold: the home
 * venue's forecast for the next two hours fills the snow filters. Nothing
 * shows without a home venue or a forecast.
 */
async function SimilarToday({ f }: { f: Filters }) {
  const supabase = await createClient();
  const [venues, today] = await Promise.all([loadVenues(supabase), loadTodayVenue(supabase)]);
  const venue = venues.filter(forecastable).find((v) => v.id === today.id);
  if (!venue) return null;
  const w = (await forecastFor(venue, { hours: 2 })).window;
  if (!w) return null;
  const fields = Object.fromEntries(new URLSearchParams(similarQuery(w)));
  // Already applied (the page opened with these values): shown ticked.
  const now = f as unknown as Record<string, unknown>;
  const initiallyOn = Object.entries(fields).every(([k, v]) => String(now[k] ?? "") === v);
  return (
    <SimilarOption
      fields={fields}
      initiallyOn={initiallyOn}
      detail={`Snow within 3 °C of today's ${deg(Math.round(w.snow_temp_c * 10) / 10)} at ${venue.name}, all seasons, best glide first`}
    />
  );
}
