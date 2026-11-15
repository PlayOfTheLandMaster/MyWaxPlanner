import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { HUMIDITY_BANDS, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { TECHNIQUES, TECHNIQUE_LABELS } from "@/lib/skis/input";
import {
  activeCount,
  parseFilters,
  periodRange,
  recentSeasons,
  toQuery,
  type Filters,
  type Sort,
} from "@/lib/history/filters";
import { KICK_FEELS, KICK_FEEL_LABELS, MODES, MODE_LABELS, STATUSES, STATUS_LABELS } from "@/lib/history/vocab";
import { LocalTime } from "@/components/local-time";
import { deleteFilter, saveFilter } from "./actions";
import { SaveFilterForm } from "./save-filter-form";

export const metadata: Metadata = { title: "History · My Wax Planner" };

type Row = {
  id: string;
  occurred_at: string;
  status: "planned" | "completed";
  technique: "classic" | "skate";
  mode: "recreational" | "race";
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
      <h1 className="text-2xl font-bold">History</h1>
      <Link
        href="/history/new"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
      >
        Log a session
      </Link>
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

  let query = supabase
    .from("wax_session_list")
    .select(
      "id, occurred_at, status, technique, mode, ski_name, venue_name, event_name, glide_rating, grip_rating, kick_feel, snow_temp_c, air_temp_c, snow_type, snow_humidity_band, waxes, fluoro_free",
    )
    .limit(300);
  const range = periodRange(f.period, now);
  if (range?.from) query = query.gte("occurred_at", range.from);
  if (range?.to) query = query.lt("occurred_at", range.to);
  if (f.technique) query = query.eq("technique", f.technique);
  if (f.ski) query = query.eq("ski_id", f.ski);
  if (f.venue) query = query.eq("venue_id", f.venue);
  if (f.mode) query = query.eq("mode", f.mode);
  if (f.status) query = query.eq("status", f.status);
  if (f.snow) query = query.eq("snow_type", f.snow);
  if (f.snowhum) query = query.eq("snow_humidity_band", f.snowhum);
  if (f.airhum) query = query.eq("air_humidity_band", f.airhum);
  if (f.brand) query = query.contains("brand_names", [f.brand]);
  if (f.product) query = query.contains("product_ids", [f.product]);
  if (f.glide) query = query.gte("glide_rating", f.glide);
  if (f.grip) query = query.gte("grip_rating", f.grip);
  if (f.kick) query = query.eq("kick_feel", f.kick);
  if (f.tmin !== undefined) query = query.gte("snow_temp_c", f.tmin);
  if (f.tmax !== undefined) query = query.lte("snow_temp_c", f.tmax);
  if (f.q) query = query.ilike("search_text", `%${f.q.toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  if (f.sort === "glide") query = query.order("glide_rating", { ascending: false, nullsFirst: false });
  if (f.sort === "grip") query = query.order("grip_rating", { ascending: false, nullsFirst: false });
  if (f.sort === "snow_temp") query = query.order("snow_temp_c", { ascending: true, nullsFirst: false });
  query = query.order("occurred_at", { ascending: false });

  const [list, skis, venues, brands, saved] = await Promise.all([
    query,
    supabase.from("skis").select("id, name").order("name"),
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
  const rows = (list.data ?? []) as Row[];
  const brandNames = [...new Set((brands.data ?? []).flatMap((b) => b.brand_names as string[]))].sort();
  const skiName = new Map((skis.data ?? []).map((k) => [k.id as string, k.name as string]));
  const venueName = new Map((venues.data ?? []).map((v) => [v.id as string, v.name as string]));
  const n = activeCount(f);
  const here = toQuery(f);

  type Chip = { label: string; without: Partial<Filters> };
  const chips = (
    [
    f.technique && { label: TECHNIQUE_LABELS[f.technique as "classic"], without: { technique: undefined } },
    f.ski && { label: skiName.get(f.ski) ?? "Skis", without: { ski: undefined } },
    f.venue && { label: venueName.get(f.venue) ?? "Venue", without: { venue: undefined } },
    f.mode && { label: MODE_LABELS[f.mode as "race"], without: { mode: undefined } },
    f.status && { label: STATUS_LABELS[f.status as "planned"], without: { status: undefined } },
    (f.tmin !== undefined || f.tmax !== undefined) && {
      label: `Snow ${f.tmin !== undefined ? deg(f.tmin) : "…"} to ${f.tmax !== undefined ? deg(f.tmax) : "…"}`,
      without: { tmin: undefined, tmax: undefined },
    },
    f.snow && { label: SNOW_TYPE_LABELS[f.snow as "wet"], without: { snow: undefined } },
    f.snowhum && { label: `Snow ${HUMIDITY_LABELS[f.snowhum as "dry"].toLowerCase()}`, without: { snowhum: undefined } },
    f.airhum && { label: `Air ${HUMIDITY_LABELS[f.airhum as "dry"].toLowerCase()}`, without: { airhum: undefined } },
    f.brand && { label: f.brand, without: { brand: undefined } },
    f.product && { label: "One wax", without: { product: undefined } },
    f.glide && { label: `Glide ≥ ${f.glide}`, without: { glide: undefined } },
    f.grip && { label: `Grip ≥ ${f.grip}`, without: { grip: undefined } },
    f.kick && { label: `Kick: ${KICK_FEEL_LABELS[f.kick as "good"].toLowerCase()}`, without: { kick: undefined } },
    f.q && { label: `“${f.q}”`, without: { q: undefined } },
    ] as (Chip | false | "" | 0 | undefined)[]
  ).filter((c): c is Chip => Boolean(c));

  const periodLabel = (p: string) =>
    p === "season" ? "This season" : p === "30d" ? "Last 30 days" : p === "all" ? "All time" : `Season ${p.replace("-", "–")}`;

  return (
    <div className="flex flex-col gap-4">
      {(saved.data ?? []).length > 0 && (
        <nav aria-label="Saved filters" className="flex flex-wrap gap-2">
          {(saved.data ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/history?${s.query}`}
              aria-current={here === `?${s.query}` ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${here === `?${s.query}` ? "border-accent bg-tile font-semibold" : "border-line bg-surface"}`}
            >
              ★ {s.name}
            </Link>
          ))}
        </nav>
      )}

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

      <details className="rounded-xl border border-line bg-surface" open={n > 0 || undefined}>
        <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
          Filters{n > 0 ? ` (${n})` : ""}
        </summary>
        {/* A plain GET form: the filters become the page address, so the back
            button, bookmarks and saved filters all just work. */}
        <form method="get" action="/history" className="flex flex-col gap-3 p-4 pt-0">
          {f.sort !== "date" && <input type="hidden" name="sort" value={f.sort} />}
          <label className={label}>
            Period
            <select name="period" defaultValue={f.period} className={field}>
              <option value="season">This season</option>
              <option value="30d">Last 30 days</option>
              {recentSeasons(now).slice(1).map((s) => (
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
          <div className="grid grid-cols-2 gap-2">
            <Link href="/history" className="flex min-h-11 items-center justify-center rounded-lg border border-line text-sm">
              Clear all
            </Link>
            <button type="submit" className="min-h-11 rounded-lg bg-accent font-semibold text-on-accent">
              Show sessions
            </button>
          </div>
        </form>
      </details>

      {chips.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={`/history${toQuery(f, c.without)}`}
                aria-label={`Remove filter: ${c.label}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent bg-tile px-3 text-sm"
              >
                {c.label} <span aria-hidden>✕</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 text-sm">
        <p>
          {rows.length} {rows.length === 1 ? "session" : "sessions"} · {periodLabel(f.period).toLowerCase()}
        </p>
        <nav aria-label="Sort" className="flex flex-wrap justify-end gap-x-3">
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

      {n > 0 && (
        <section aria-labelledby="save-filter" className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
          <h2 id="save-filter" className="font-semibold">
            Save this filter
          </h2>
          <SaveFilterForm save={saveFilter.bind(null, here)} />
        </section>
      )}

      {(saved.data ?? []).length > 0 && (
        <details className="rounded-xl border border-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm">Manage saved filters</summary>
          <ul className="flex flex-col p-2">
            {(saved.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">{s.name}</span>
                <form action={deleteFilter.bind(null, s.id)}>
                  <button type="submit" className="min-h-11 px-3 text-sm text-danger">
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Select({
  name,
  label: text,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
}) {
  return (
    <label className={label}>
      {text}
      <select name={name} defaultValue={value ?? ""} className={field}>
        <option value="">Any</option>
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
              {r.status === "planned" && <span className="ml-2 rounded-full bg-tile px-2 text-xs">Planned</span>}
            </p>
            <p className="truncate font-medium">
              {r.event_name ?? r.venue_name ?? "Session"}
              <span className="font-normal text-muted"> · {TECHNIQUE_LABELS[r.technique]}{r.mode === "race" ? " race" : ""}</span>
            </p>
            {r.ski_name && <p className="truncate text-sm text-muted">{r.ski_name}</p>}
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
