import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { loadHomeVenueId, loadVenues } from "@/lib/venues/load";
import { forecastFor } from "@/lib/weather/window";
import { ForecastCard } from "@/components/forecast-card";

// Today: the home venue's forecast for the next couple of hours, the way into
// a plan, "Similar to today" from the history, and the wax box.

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Today</h1>
      <Suspense fallback={<p className="text-muted">Loading the forecast…</p>}>
        <HomeForecast />
      </Suspense>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Account />
        <WaxBox />
      </Suspense>
    </main>
  );
}

async function Account() {
  const user = await currentUser();
  return (
    <section className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
      <p className="min-w-0 truncate">
        Signed in as <span className="font-medium">{user?.email}</span>
      </p>
      <form action={signOut}>
        <button type="submit" className="min-h-11 shrink-0 rounded-lg border border-line px-4 active:bg-tile">
          Sign out
        </button>
      </form>
    </section>
  );
}

async function WaxBox() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("user_products")
    .select("id", { count: "exact", head: true });

  return (
    <Link
      href="/wax-box"
      className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 active:bg-tile"
    >
      <span>
        <span className="block font-semibold">Wax box</span>
        <span className="text-sm text-muted">
          {error
            ? "Could not count your waxes"
            : count
              ? `${count} ${count === 1 ? "wax" : "waxes"}`
              : "Empty — add your first wax"}
        </span>
      </span>
      <span aria-hidden className="text-muted">
        →
      </span>
    </Link>
  );
}

async function HomeForecast() {
  const supabase = await createClient();
  const [venues, home] = await Promise.all([loadVenues(supabase), loadHomeVenueId(supabase)]);
  const venue = venues.find((v) => v.id === home);
  const plan = (
    <Link
      href={venue ? `/plan?venue=${venue.id}` : "/plan"}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
    >
      Plan a wax
    </Link>
  );
  if (!venue) {
    return (
      <section className="flex flex-col gap-3">
        {plan}
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          Pick a home venue to see its forecast here.{" "}
          <Link href="/venues" className="text-link underline">
            Choose venues
          </Link>
        </p>
      </section>
    );
  }

  const result = await forecastFor(venue, { hours: 2 });
  const w = result.window;
  // The spec's "Similar to today": past sessions within 3 °C of today's snow,
  // on the same kind of snow, best glide first.
  const similar = w
    ? new URLSearchParams({
        period: "all",
        tmin: String(Math.max(-40, Math.floor(w.snow_temp_c - 3))),
        tmax: String(Math.min(0, Math.ceil(w.snow_temp_c + 3))),
        snowhum: w.snow_humidity_band,
        sort: "glide",
      })
    : null;

  return (
    <section className="flex flex-col gap-3">
      {w ? (
        <ForecastCard w={w} compact />
      ) : (
        <p role="alert" className="rounded-xl border border-line bg-surface p-4 text-sm text-danger">
          {result.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {plan}
        {similar ? (
          <Link
            href={`/history?${similar}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold active:bg-tile"
          >
            Similar to today
          </Link>
        ) : (
          <span />
        )}
      </div>
      <Link href="/venues" className="self-start text-sm text-link underline">
        Change home venue
      </Link>
    </section>
  );
}
