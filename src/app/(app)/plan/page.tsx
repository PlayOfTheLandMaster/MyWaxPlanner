import { BackLink } from "@/components/nav-trail";
import { Suspense } from "react";
import { SkierBanner } from "@/components/skier-banner";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { forecastable, loadVenues } from "@/lib/venues/load";
import { forecastFor } from "@/lib/weather/window";
import { ConditionsForm } from "./conditions-form";
import { loadTodayVenue } from "@/lib/venues/today-load";
import { checkFor } from "@/lib/snow/check";
import { loadSnowCheck } from "@/lib/snow/load";
import { WhereWhenForm } from "./where-when-form";
import { ContinueList } from "@/components/session/continue-list";
import { fold, foldHead } from "@/components/fold";
import { WeatherFold } from "@/components/weather-fold";

export const metadata: Metadata = { title: "My Sessions · My Wax Planner" };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
// A hairline between the page's three groups (plan, record, the lists): a
// quiet break, in the card borders' grey, with a little room either side.
const divider = <hr className="my-1 border-line" />;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export default function PlanPage({ searchParams }: PageProps<"/plan">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      {/* The Session tab: its own title, then a new plan (where, weather and
          snow), a way to log a wax done without a plan, then the sessions
          already planned. */}
      {/* A tab, but still reached from somewhere: back to the page you came from, else Today. */}
      <BackLink fallback="/" fallbackLabel="Today" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">My Sessions</h1>
      <Suspense fallback={null}>
        <Copied searchParams={searchParams} />
      </Suspense>
      <div>
        <h2 className="text-lg font-semibold">Plan a wax session</h2>
        <p className="text-sm text-muted">
          The app suggests waxes from your box. Enter where and when you&apos;ll ski, and what the snow is like.
        </p>
      </div>
      <Suspense fallback={null}>
        <SkierBanner />
      </Suspense>
      {/* At the top, so the list below must not jump when the forecast arrives:
          the fallback holds the folded cards' height. */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-3" aria-busy>
            <p className={`${fold} flex min-h-16 items-center px-4 text-muted`}>Loading the forecast…</p>
            <p className={`${fold} min-h-16`} aria-hidden />
            <p className={`${fold} min-h-16`} aria-hidden />
            <p className="min-h-11" aria-hidden />
          </div>
        }
      >
        <Plan searchParams={searchParams} />
      </Suspense>
      {divider}
      {/* The list and the card share one boundary: the planned-sessions list
          used to arrive a moment after the card and push it down the page.
          The plan above waits on the forecast, so it keeps its own. */}
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        {/* Above the list: the full form for a wax done without a plan. */}
        <Link
          href="/history/new?record=1"
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 active:bg-tile"
        >
          <span>
            <span className="block font-semibold">Record a wax job</span>
            <span className="block text-sm text-muted">Already waxed, or picked your own waxes? Enter what went on the skis.</span>
          </span>
          <span aria-hidden className="text-muted">
            →
          </span>
        </Link>
        {/* ContinueList draws its own divider, only when it has sessions to list. */}
        <ContinueList />
      </Suspense>
    </main>
  );
}

async function Plan({ searchParams }: { searchParams: PageProps<"/plan">["searchParams"] }) {
  const p = await searchParams;
  const supabase = await createClient();
  const [venues, today, snowCheck] = await Promise.all([loadVenues(supabase), loadTodayVenue(supabase), loadSnowCheck(supabase)]);
  // Today's location (set on Today), else home; the form can still pick another.
  const home = today.id;
  const usable = venues.filter(forecastable);
  const venueId = one(p.venue) ?? home ?? undefined;
  const venue = usable.find((v) => v.id === venueId);
  const hours = Number(one(p.hours) ?? 2) || 2;
  const result = venue ? await forecastFor(venue, { date: one(p.date), time: one(p.time), hours }) : null;

  return (
    <>
      {/* Folded, where and when is one line; it opens by itself until a venue is chosen. */}
      <details className={fold} open={!venue}>
        <summary className={foldHead}>
          <span aria-hidden className="text-2xl leading-none">
            📍
          </span>
          <span className="min-w-0">
            <span className="block truncate">
              <span className="text-sm text-muted">Where you&apos;ll ski: </span>
              <span className="font-semibold">{venue?.name ?? "choose a venue"}</span>
            </span>
            {result?.window && <span className="block truncate text-sm text-muted">{when(result.date, result.time, result.hours)}</span>}
          </span>
        </summary>
        {/* GET, so the chosen venue and time are in the address and survive a reload. */}
        <WhereWhenForm className="flex flex-col gap-3 px-4 pb-4">
          <label className={label}>
            Where you&apos;ll ski
            <select name="venue" defaultValue={venue?.id ?? ""} required className={field}>
              <option value="" disabled>
                Choose a venue…
              </option>
              {usable.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.region ? ` — ${v.region}` : ""}
                </option>
              ))}
            </select>
          </label>
          <Link href="/venues/new?back=plan" className="-mt-1 self-start text-sm text-link underline">
            Add a venue
          </Link>
          <div className="grid grid-cols-3 gap-2">
            <label className={label}>
              Date
              <input type="date" name="date" defaultValue={result?.date ?? one(p.date)} className={field} />
            </label>
            <label className={label}>
              Start
              <input type="time" name="time" defaultValue={result?.time ?? one(p.time)} className={field} />
            </label>
            <label className={label}>
              Out for
              <select name="hours" defaultValue={String(result?.hours ?? hours)} className={field}>
                {[1, 2, 3, 4, 5, 6, 8].map((h) => (
                  <option key={h} value={h}>
                    {h} h
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted">Times are the venue&apos;s local time. Any minute is fine; the forecast is hourly.</p>
          <button type="submit" className="min-h-11 rounded-lg border border-line px-4 font-semibold active:bg-tile">
            {venue ? "Update forecast" : "Get forecast"}
          </button>
        </WhereWhenForm>
      </details>

      {!venue && usable.length === 0 && (
        <p className="rounded-xl border border-line bg-surface p-4 text-muted">Add a venue to get its forecast.</p>
      )}
      {result?.error && (
        <p role="alert" className="rounded-xl border border-line bg-surface p-4 text-sm text-danger">
          {result.error}
        </p>
      )}
      {result?.window && (
        <>
          <WeatherFold w={result.window} />
          <ConditionsForm
            key={`${result.window.venue.id}${result.window.start}${result.hours}`}
            w={result.window}
            check={checkFor(snowCheck, result.window.venue.id, result.window.start.slice(0, 10))}
            isToday={result.window.start.slice(0, 10) === new Date().toLocaleDateString("en-CA", { timeZone: result.window.timezone })}
          />
        </>
      )}
    </>
  );
}

/** After "Copy to other skis": how many sessions were made, listed just below. */
async function Copied({ searchParams }: { searchParams: PageProps<"/plan">["searchParams"] }) {
  const n = Number((await searchParams).copied);
  if (!Number.isInteger(n) || n < 1) return null;
  return (
    <p role="status" className="rounded-lg border border-accent bg-tile p-3 text-sm">
      Copied to {n} {n === 1 ? "pair" : "pairs"}. Each is under Current sessions: mark it done and rate it on its own.
    </p>
  );
}

/** "Tue, Nov 17 · 10:00 · 2 h": the plan's day, start and length, for the folded line. */
function when(date: string | undefined, time: string | undefined, hours: number | undefined): string {
  const day = date ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : "";
  return [day, time, hours ? `${hours} h` : null].filter(Boolean).join(" · ");
}
