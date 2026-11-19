import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { historyQuery } from "@/lib/history/query";
import { CLOSE_C, likeToday, likeTodayRange, type PastJob, type Today } from "@/lib/history/like-today";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import type { HumidityBand, SnowType } from "@/lib/catalogue/vocab";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { forecastable, loadVenues } from "@/lib/venues/load";
import { loadTodayVenue } from "@/lib/venues/today-load";
import { forecastFor } from "@/lib/weather/window";
import { loadSnowCheck } from "@/lib/snow/load";
import { checkFor } from "@/lib/snow/check";
import { LocalTime } from "@/components/local-time";
import { BackLink } from "@/components/nav-trail";
import { SkierBanner } from "@/components/skier-banner";

export const metadata: Metadata = { title: "Wax jobs like today · My Wax Planner" };

const deg = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C";
const short = (t: string) => SNOW_TYPE_LABELS[t as SnowType].split(/[,/]/)[0].trim();

type Row = PastJob & {
  technique: "classic" | "skate";
  mode: string;
  skier_name: string | null;
  ski_name: string | null;
  waxes: string;
  grip_rating: number | null;
};

// Past wax jobs in snow very like today's, one group per location.
export default function LikeTodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink fallback="/history" fallbackLabel="History" className="inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">Wax jobs like today</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <LikeToday />
      </Suspense>
    </main>
  );
}

async function LikeToday() {
  const supabase = await createClient();
  const [venues, todayVenue, saved, who] = await Promise.all([loadVenues(supabase), loadTodayVenue(supabase), loadSnowCheck(supabase), loadSkierContext()]);
  const venue = venues.filter(forecastable).find((v) => v.id === todayVenue.id);
  if (!venue) {
    return (
      <p className="text-sm">
        Set today&apos;s location on <Link href="/" className="text-link underline">Today</Link> first: this page compares past wax jobs
        with the snow there.
      </p>
    );
  }
  const w = (await forecastFor(venue, { hours: 2 })).window;
  if (!w) return <p className="text-sm text-danger">The forecast for {venue.name} could not be read. Reload the page to try again.</p>;

  // The skier's own check for today, where there is one; the forecast's estimate otherwise.
  const check = checkFor(saved, venue.id, w.start.slice(0, 10));
  const today: Today = check
    ? { snow_temp_c: check.snow_temp_c, snow_humidity_band: check.snow_humidity_band, snow_type: check.snow_type }
    : { snow_temp_c: Math.min(0, w.snow_temp_c), snow_humidity_band: w.snow_humidity_band, snow_type: w.snow_type };

  const skier = who.skiers.length > 0 ? who.key : undefined;
  const range = likeTodayRange(today);
  const { data, error } = await historyQuery(
    supabase,
    "id, occurred_at, technique, mode, skier_name, ski_name, venue_id, venue_name, glide_rating, grip_rating, snow_temp_c, snow_humidity_band, snow_type, waxes",
    { period: "all", sort: "date", ...range },
    skier,
    new Date(),
  ).limit(300);
  if (error) return <p role="alert" className="text-sm text-danger">Could not read your history: {error.message}</p>;
  const groups = likeToday((data ?? []) as unknown as Row[], today);
  const count = groups.reduce((n, g) => n + g.jobs.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <SkierBanner />
      <section className="rounded-xl border border-line bg-surface p-4">
        <p className="text-sm text-muted">Today at {venue.name}{check ? ", as you checked it" : ", estimated from the forecast"}</p>
        <p className="font-semibold">
          Snow {deg(today.snow_temp_c)} · {HUMIDITY_LABELS[today.snow_humidity_band as HumidityBand].toLowerCase()} snow
          {today.snow_type ? ` · ${short(today.snow_type).toLowerCase()}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          Wax jobs with snow within {CLOSE_C} °C and the same snowball result, closest first; a different snow type counts as one degree further. Ties go to the best glide.
          {!check && (
            <>
              {" "}
              Save <Link href="/" className="text-link underline">Today&apos;s Skiing Conditions</Link> to match your own check instead.
            </>
          )}
        </p>
      </section>

      {count === 0 ? (
        <p className="text-sm">No wax jobs yet in snow like today&apos;s. Rate today&apos;s session after skiing, and the next day like this will find it.</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {count} wax {count === 1 ? "job" : "jobs"} at {groups.length} {groups.length === 1 ? "location" : "locations"}.
          </p>
          {groups.map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <h2 className="font-semibold">
                {g.name} <span className="font-normal text-muted">· {g.jobs.length}</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {g.jobs.map((j) => (
                  <li key={j.id}>
                    <Link href={`/history/${j.id}`} className="block rounded-xl border border-line bg-surface p-3 active:bg-tile">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-muted">
                            <LocalTime iso={j.occurred_at} format="date" /> · {TECHNIQUE_LABELS[j.technique]}
                            {j.mode === "race" ? " race" : ""}
                          </p>
                          {(j.skier_name || j.ski_name) && <p className="truncate text-sm">{[j.skier_name, j.ski_name].filter(Boolean).join(" · ")}</p>}
                          <p className="text-sm">
                            Snow {deg(j.snow_temp_c!)}
                            {j.snow_type ? ` · ${short(j.snow_type)}` : ""}
                            <span className="text-muted">
                              {" "}
                              ({j.degreesOff === 0 ? "same temperature" : `${j.degreesOff} °C off`}
                              {today.snow_type ? (j.sameSnowType ? ", same snow type" : ", other snow type") : ""})
                            </span>
                          </p>
                          {j.waxes && <p className="truncate text-sm text-muted">{j.waxes}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                          {j.glide_rating ? <span className="rounded-full bg-tile px-2 py-0.5">Glide {j.glide_rating}</span> : <span className="text-muted">Not rated</span>}
                          {j.grip_rating && <span className="rounded-full bg-tile px-2 py-0.5">Grip {j.grip_rating}</span>}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
