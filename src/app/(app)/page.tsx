import { Suspense, cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { forecastable, loadVenues, type VenueRow } from "@/lib/venues/load";
import { loadTodayVenue } from "@/lib/venues/today-load";
import { groupByPlace } from "@/lib/venues/place";
import { setTodayVenue } from "./snow-actions";
import { forecastFor } from "@/lib/weather/window";
import { ForecastCard } from "@/components/forecast-card";
import { SnowCheckForm } from "@/components/snow-check-form";
import { checkFor } from "@/lib/snow/check";
import { loadSnowCheck } from "@/lib/snow/load";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { SKY_ICONS, SKY_LABELS } from "@/lib/history/vocab";
import { LocalTime } from "@/components/local-time";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { loadSkierContext } from "@/lib/skiers/current";
import { FALLBACK } from "@/lib/profile/name";
import { progress, setupSteps } from "@/lib/setup/steps";
import { SetupChecklist } from "@/components/setup-checklist";
import { isExpert } from "@/lib/profile/style";

export const metadata: Metadata = { title: "Today · My Wax Planner" };

// Today has one job: get the skier to "what goes on my skis today?" in as few
// taps as possible, then close the loop afterwards ("How did it go?").
// New accounts see a short getting-started checklist first.

const card = "rounded-xl border border-line bg-surface p-4";
// The three folding cards (location, weather, snow) share one frame and one
// header, so their arrows line up and their rows are the same height.
const fold = "rounded-xl border border-line bg-surface";
const foldHead = "flex min-h-16 cursor-pointer items-center gap-3 px-4 py-2 active:bg-tile";

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Today</h1>
        <Link
          href="/account"
          aria-label="Account"
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface active:bg-tile"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
        </Link>
      </header>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Today />
      </Suspense>
    </main>
  );
}

type Planned = {
  id: string;
  occurred_at: string;
  technique: "classic" | "skate";
  mode: "recreational" | "race";
  venue_name: string | null;
  event_name: string | null;
};

async function Today() {
  const supabase = await createClient();
  const now = new Date();
  const who = await loadSkierContext();
  let plannedQuery = supabase
    .from("wax_session_list")
    .select("id, occurred_at, technique, mode, venue_name, event_name")
    .eq("status", "planned");
  plannedQuery = who.current ? plannedQuery.eq("skier_id", who.current.id) : plannedQuery.is("skier_id", null);
  const [venues, today, planned, skiCount, box, toolCount, skierCount, theirSkis] = await Promise.all([
    loadVenues(supabase),
    loadTodayVenue(supabase),
    plannedQuery.order("occurred_at", { ascending: true }).limit(20),
    supabase.from("skis").select("id", { count: "exact", head: true }),
    supabase.from("user_products").select("amount_left"),
    supabase.from("user_tools").select("id", { count: "exact", head: true }),
    supabase.from("skiers").select("id", { count: "exact", head: true }),
    // Pairs belonging to whoever is picked: none means a plan for them has no skis to choose.
    (who.current
      ? supabase.from("skis").select("id", { count: "exact", head: true }).eq("skier_id", who.current.id)
      : supabase.from("skis").select("id", { count: "exact", head: true }).is("skier_id", null)),
  ]);

  const home = today.home;
  const waxes = box.data ?? [];
  const steps = setupSteps({ style: who.style, home: home !== null, skiers: skierCount.count ?? 0, skis: skiCount.count ?? 0, waxes: waxes.length, tools: toolCount.count ?? 0 });
  const { todo } = progress(steps);
  const expert = isExpert(who.style);

  // Today's location: picked on this page for every wax job today, else home.
  const usable = venues.filter(forecastable);
  const venue = usable.find((v) => v.id === today.id) ?? usable.find((v) => v.id === home) ?? null;

  const rows = (planned.data ?? []) as Planned[];
  const upcoming = rows.find((r) => new Date(r.occurred_at) >= new Date(now.getTime() - 3 * 3600_000));
  // A planned session whose time has passed (by more than the session itself) is waiting for its ratings.
  const waiting = [...rows].reverse().find((r) => new Date(r.occurred_at) < new Date(now.getTime() - 3 * 3600_000));

  return (
    <>
      {who.me === FALLBACK && (
        // Accounts made before names were asked for: the app says "Me" until one is added.
        <Link href="/account" className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-accent bg-tile px-4 py-2 text-sm active:opacity-70">
          <span>Add your first name and last initial, so the app can name your skis and sessions.</span>
          <span aria-hidden className="text-link">→</span>
        </Link>
      )}
      {/* No skier picker on Today: the main button names the skier, and the
          screen it opens (Plan a wax, Record a wax job) has the picker. */}

      {/* The checklist covers the account's first pair; this is a skier
          picked later, with none of their own yet. */}
      {(skiCount.count ?? 0) > 0 && theirSkis.count === 0 && (
        <Link
          href={`/wax-box/skis/new?skier=${who.key}`}
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-accent bg-tile px-4 py-2 text-sm active:opacity-70"
        >
          <span>
            {who.current ? `${who.current.name} has no skis yet.` : "You have no skis of your own yet."}{" "}
            <span className="text-link underline">Add skis</span>
          </span>
          <span aria-hidden className="text-link">→</span>
        </Link>
      )}

      {todo > 0 && (
        <section className={card} aria-label="Getting started">
          <SetupChecklist steps={steps} next={steps.find((s) => !s.done)?.key} />
        </section>
      )}

      {expert ? (
        // An expert picks their own waxes: the main button records them, and
        // the app's suggestion stays one tap away underneath.
        <>
          <Link
            href={venue ? `/history/new?record=1&venue=${venue.id}` : "/history/new?record=1"}
            className="flex min-h-14 items-center justify-center rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70"
          >
            {who.current ? `Record a wax job for ${who.current.name}` : "Record a wax job"}
          </Link>
          <Link
            href={venue ? `/plan?venue=${venue.id}` : "/plan"}
            className="-mt-2 inline-flex min-h-11 items-center justify-center self-center text-sm text-link underline"
          >
            What would the app suggest?
          </Link>
        </>
      ) : (
        <>
          <Link
            href={venue ? `/plan?venue=${venue.id}` : "/plan"}
            className="flex min-h-14 items-center justify-center rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70"
          >
            {who.current ? `Plan a wax for ${who.current.name}` : "Plan a wax"}
          </Link>
          <Link
            href={venue ? `/history/new?record=1&venue=${venue.id}` : "/history/new?record=1"}
            className="-mt-2 inline-flex min-h-11 items-center justify-center self-center text-sm text-link underline"
          >
            Already waxed? Record a wax job
          </Link>
        </>
      )}

      {waiting && (
        <Link href={`/session/${waiting.id}#rate`} className={`${card} flex items-center justify-between gap-3 border-accent active:bg-tile`}>
          <span className="min-w-0">
            <span className="block font-semibold">How did it go?</span>
            <span className="block truncate text-sm text-muted">
              <LocalTime iso={waiting.occurred_at} format="date" /> · {waiting.event_name ?? waiting.venue_name ?? TECHNIQUE_LABELS[waiting.technique]} — rate it in a few taps
            </span>
          </span>
          <span aria-hidden className="text-muted">→</span>
        </Link>
      )}
      {upcoming && (
        <Link href={`/session/${upcoming.id}`} className={`${card} flex items-center justify-between gap-3 active:bg-tile`}>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Active Session In Progress</span>
            <span className="block truncate font-medium">
              <LocalTime iso={upcoming.occurred_at} /> · {upcoming.event_name ?? upcoming.venue_name ?? "Session"}
            </span>
            <span className="block text-sm text-muted">
              {TECHNIQUE_LABELS[upcoming.technique]}
              {upcoming.mode === "race" ? " race" : ""} · open the plan
            </span>
          </span>
          <span aria-hidden className="text-muted">→</span>
        </Link>
      )}

      {/* Set once here; Plan a wax and Record a wax job follow it until the day ends. */}
      {usable.length > 0 && (
        <details className={fold}>
          {/* The fold's own arrow opens the list, as on the cards below it. */}
          <summary className={foldHead}>
            <span aria-hidden className="text-2xl leading-none">
              📍
            </span>
            <span className="min-w-0 truncate">
              <span className="text-sm text-muted">Location: </span>
              <span className="font-semibold">{venue?.name ?? "none set"}</span>
              {venue && venue.id === home && <span className="text-sm text-muted"> · home</span>}
            </span>
          </summary>
          <div className="flex flex-col gap-2 px-4 pb-4">
            <p className="text-sm text-muted">
              Every wax job today uses this location, until the end of the day. Tomorrow starts at your home venue again.
            </p>
            {/* By country, then province or state, then A–Z. */}
            {groupByPlace(usable).map((c) => (
              <section key={c.country} aria-label={c.country} className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{c.country}</h3>
                {c.provinces.map((pr) => (
                  <div key={pr.province ?? "-"}>
                    {pr.province && <h4 className="text-sm font-semibold">{pr.province}</h4>}
                    <ul className="flex flex-col divide-y divide-line">
                      {pr.venues.map((v) => {
                        const on = v.id === venue?.id;
                        return (
                          <li key={v.id}>
                            <form action={setTodayVenue.bind(null, v.id === home ? "home" : v.id)}>
                              <button
                                type="submit"
                                aria-pressed={on}
                                className="flex min-h-11 w-full items-center gap-3 text-left active:bg-tile"
                              >
                                <span
                                  aria-hidden
                                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${on ? "border-accent bg-accent text-on-accent" : "border-line"}`}
                                >
                                  {on ? "✓" : ""}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className={`block truncate ${on ? "font-semibold" : ""}`}>{v.name}</span>
                                  {v.region && <span className="block truncate text-xs text-muted">{v.region}</span>}
                                </span>
                                {v.id === home && <span className="shrink-0 text-xs text-muted">home</span>}
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
            <Link href="/venues/new?back=today" className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-link underline">
              <span aria-hidden>＋</span> Add a location
            </Link>
          </div>
        </details>
      )}
      {venue ? (
        <Suspense fallback={<p className={`${card} text-muted`}>Loading the forecast for {venue.name}…</p>}>
          <Conditions venue={venue} />
        </Suspense>
      ) : (
        <p className={`${card} text-sm text-muted`}>
          <Link href="/venues" className="text-link underline">
            Pick a home venue
          </Link>{" "}
          to see its conditions here.
        </p>
      )}

    </>
  );
}

// One forecast request per venue per page.
const nextTwoHours = cache((venue: VenueRow) => forecastFor(venue, { hours: 2 }));

async function Conditions({ venue }: { venue: VenueRow }) {
  const supabase = await createClient();
  const [result, saved] = await Promise.all([nextTwoHours(venue), loadSnowCheck(supabase)]);
  if (!result.window) {
    return (
      <p role="alert" className={`${card} text-sm text-danger`}>
        {result.error}
      </p>
    );
  }
  const w = result.window;
  // The venue's own date: the check is for this place, today, wherever the phone is.
  const day = w.start.slice(0, 10);
  const check = checkFor(saved, venue.id, day);
  const temp = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C";
  return (
    <>
      {/* Folded, the weather is one line: the air temperature and the sky. */}
      <details className={fold}>
        <summary className={foldHead}>
          <span aria-hidden className="text-4xl leading-none">
            {SKY_ICONS[w.sky]}
          </span>
          <span className="text-2xl font-bold">{temp(w.air_temp_c)}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{SKY_LABELS[w.sky]}</span>
            <span className="block truncate text-sm text-muted">{venue.name}</span>
          </span>
        </summary>
        <ForecastCard w={w} compact bare />
      </details>

      {/* Checked once here, used by every wax job today at this venue. */}
      <details className={fold}>
        <summary className={foldHead}>
          <span className="font-semibold">Today&apos;s Snow Conditions</span>
          <span className="truncate text-sm text-muted">
            {check
              ? `· ${temp(check.snow_temp_c)} · ${HUMIDITY_LABELS[check.snow_humidity_band].toLowerCase()} · ${SNOW_TYPE_LABELS[check.snow_type].toLowerCase()}`
              : "· Not Entered yet"}
          </span>
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="text-sm text-muted">
            {check
              ? "Checked today. Every wax job today at this venue uses these; change them if the snow changes."
              : "Filled in from the forecast. At the trail, a snowball and a glance at the track beat any estimate. Save once; every wax job today uses it."}
          </p>
          <SnowCheckForm
            venueId={venue.id}
            day={day}
            initial={
              check ?? {
                snow_temp_c: Math.min(0, w.snow_temp_c),
                snow_humidity_band: w.snow_humidity_band,
                snow_type: w.snow_type,
                track: null,
              }
            }
          />
        </div>
      </details>
    </>
  );
}
