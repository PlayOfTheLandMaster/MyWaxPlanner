import { Suspense } from "react";
import Link from "next/link";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { SetupNext } from "@/components/setup-next";
import { createClient } from "@/lib/supabase/server";
import { loadHomeVenueId, loadVenues } from "@/lib/venues/load";
import { deleteVenue, setHomeVenue } from "./actions";

export const metadata: Metadata = { title: "Venues · My Wax Planner" };

export default function VenuesPage({ searchParams }: PageProps<"/venues">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <BackLink fallback="/" />
        <h1 className="text-2xl font-bold">Venues</h1>
        <p className="text-sm text-muted">Forecasts are always for the venue you pick, at its trail height — never for where your phone is.</p>
      </div>
      <SetupNext step="venue" searchParams={searchParams} />
      <Link href="/venues/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70">
        Add a venue
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const supabase = await createClient();
  const [venues, home] = await Promise.all([loadVenues(supabase), loadHomeVenueId(supabase)]);
  const sections = [
    { title: "Your venues", rows: venues.filter((v) => v.user_id) },
    { title: "Shared venues", rows: venues.filter((v) => !v.user_id) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {sections.map((s) =>
        s.rows.length === 0 ? null : (
          <section key={s.title}>
            <h2 className="mb-2 font-semibold">{s.title}</h2>
            <ul className="flex flex-col gap-2">
              {s.rows.map((v) => (
                <li key={v.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                  <div>
                    <p className="font-medium">
                      {v.name}
                      {v.id === home && <span className="ml-2 rounded-full bg-tile px-2 text-xs">Home</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {[
                        v.region,
                        v.elevation_m !== null ? `${v.elevation_m} m` : null,
                        v.latitude === null ? "No position — forecasts unavailable" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {v.latitude !== null && (
                      <Link href={`/plan?venue=${v.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm">
                        Forecast
                      </Link>
                    )}
                    {v.id !== home && (
                      <form action={setHomeVenue.bind(null, v.id)}>
                        <button type="submit" className="min-h-11 rounded-lg border border-line px-3 text-sm">
                          Make home
                        </button>
                      </form>
                    )}
                    {v.user_id && (
                      <form action={deleteVenue.bind(null, v.id)}>
                        <button type="submit" className="min-h-11 rounded-lg px-3 text-sm text-danger">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
