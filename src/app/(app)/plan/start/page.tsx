import { BackLink } from "@/components/nav-trail";
import { Suspense } from "react";
import { SkierBanner } from "@/components/skier-banner";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { forecastable, loadVenues } from "@/lib/venues/load";
import { forecastFor } from "@/lib/weather/window";
import { ConditionsForm } from "../conditions-form";
import { loadTodayVenue } from "@/lib/venues/today-load";
import { checkFor } from "@/lib/snow/check";
import { loadSnowCheck } from "@/lib/snow/load";
import { WhereWhenForm } from "../where-when-form";
import { fold, foldHead } from "@/components/fold";
import { WeatherFold } from "@/components/weather-fold";
import { loadSkierContext } from "@/lib/skiers/current";

export const metadata: Metadata = { title: "Plan a wax session · My Wax Planner" };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

/**
 * Plan a wax session: where and when, the weather and the snow, then the
 * app's suggestion. Every wax session starts on Today, so this page is opened
 * only from there (Start a wax session, or What would the app suggest? for an
 * expert); the Sessions tab lists sessions already under way.
 */
export default function PlanStartPage({ searchParams }: PageProps<"/plan/start">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink fallback="/" fallbackLabel="Today" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <Suspense fallback={<h1 className="text-2xl font-bold">Plan a wax session</h1>}>
        <Heading />
      </Suspense>
      <Suspense fallback={null}>
        <SkierBanner />
      </Suspense>
      {/* The fallback holds the folded cards' height, so nothing jumps when the forecast arrives. */}
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
    </main>
  );
}

/** A guided waxer starts a guided session; an expert asked what the app would suggest. */
async function Heading() {
  const { style } = await loadSkierContext();
  const guided = style !== "expert";
  return (
    <div>
      <h1 className="text-2xl font-bold">{guided ? "Plan a guided wax session" : "Plan a wax session"}</h1>
      <p className="text-sm text-muted">Enter where and when you&apos;ll ski, and what the snow is like. The app suggests waxes from your box.</p>
    </div>
  );
}

async function Plan({ searchParams }: { searchParams: PageProps<"/plan/start">["searchParams"] }) {
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
          <Link href="/venues/new?back=plan" className="-mt-2 inline-flex min-h-11 items-center self-start text-sm text-link underline">
            Add a venue
          </Link>
          {/* The date gets the row's full width: a phone's date box, in a third of it, read "mm/dd/". */}
          <div className="grid grid-cols-2 gap-2">
            <label className={`${label} col-span-2`}>
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

/** "Tue, Nov 17 · 10:00 · 2 h": the plan's day, start and length, for the folded line. */
function when(date: string | undefined, time: string | undefined, hours: number | undefined): string {
  const day = date ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : "";
  return [day, time, hours ? `${hours} h` : null].filter(Boolean).join(" · ");
}
