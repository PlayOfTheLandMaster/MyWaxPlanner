import { Suspense } from "react";
import { SkierBanner } from "@/components/skier-banner";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { forecastable, loadHomeVenueId, loadVenues } from "@/lib/venues/load";
import { forecastFor } from "@/lib/weather/window";
import { ForecastCard } from "@/components/forecast-card";
import { ConditionsForm } from "./conditions-form";
import { WhereWhenForm } from "./where-when-form";
import { ContinueList } from "@/components/session/continue-list";

export const metadata: Metadata = { title: "Session · My Wax Planner" };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export default function PlanPage({ searchParams }: PageProps<"/plan">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      {/* The Session tab: its own title, then sessions already planned, a way
          to log a wax done without a plan, and a new plan. */}
      <h1 className="text-2xl font-bold">Session</h1>
      <Suspense fallback={null}>
        <Copied searchParams={searchParams} />
      </Suspense>
      {/* The list and the card share one boundary: the planned-sessions list
          used to arrive a moment after the card and push it down the page.
          The plan below waits on the forecast, so it keeps its own. */}
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <ContinueList />
        {/* Near the top, beside the plan: the full form for a wax done without one. */}
        <Link
          href="/history/new"
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 active:bg-tile"
        >
          <span>
            <span className="block font-semibold">I already waxed</span>
            <span className="block text-sm text-muted">Log what went on the skis, without a plan</span>
          </span>
          <span aria-hidden className="text-muted">
            →
          </span>
        </Link>
      </Suspense>
      <div>
        <h2 className="text-lg font-semibold">Plan a wax</h2>
        <p className="text-sm text-muted">Step 1 of 2: where and when you&apos;ll ski, and what the snow will be like.</p>
      </div>
      <Suspense fallback={null}>
        <SkierBanner />
      </Suspense>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Plan searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Plan({ searchParams }: { searchParams: PageProps<"/plan">["searchParams"] }) {
  const p = await searchParams;
  const supabase = await createClient();
  const [venues, home] = await Promise.all([loadVenues(supabase), loadHomeVenueId(supabase)]);
  const usable = venues.filter(forecastable);
  const venueId = one(p.venue) ?? home ?? undefined;
  const venue = usable.find((v) => v.id === venueId);
  const hours = Number(one(p.hours) ?? 2) || 2;
  const result = venue ? await forecastFor(venue, { date: one(p.date), time: one(p.time), hours }) : null;

  return (
    <>
      {/* GET, so the chosen venue and time are in the address and survive a reload. */}
      <WhereWhenForm className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
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
          <ForecastCard w={result.window} />
          <ConditionsForm key={`${result.window.venue.id}${result.window.start}${result.hours}`} w={result.window} />
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
