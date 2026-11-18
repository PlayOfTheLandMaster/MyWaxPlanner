import { Suspense } from "react";
import Link from "next/link";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { SetupNext } from "@/components/setup-next";
import { createClient } from "@/lib/supabase/server";
import { loadHomeVenueId, loadVenues } from "@/lib/venues/load";
import { hideVenue, removeVenue, setHomeVenue, unhideVenue } from "./actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { isAdmin } from "@/lib/learn/load";

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
        <NotDeleted searchParams={searchParams} />
        <List />
      </Suspense>
    </main>
  );
}

async function NotDeleted({ searchParams }: { searchParams: PageProps<"/venues">["searchParams"] }) {
  if (!(await searchParams).notdeleted) return null;
  return (
    <p role="alert" className="rounded-lg border border-line bg-surface p-3 text-sm text-danger">
      That venue could not be deleted. Reload the page and try again; if it is still there, tell the admin.
    </p>
  );
}

async function List() {
  const supabase = await createClient();
  const [all, home, admin] = await Promise.all([loadVenues(supabase, { includeHidden: true }), loadHomeVenueId(supabase), isAdmin(supabase)]);
  const venues = all.filter((v) => !v.hidden);
  const hidden = all.filter((v) => v.hidden);
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
                    {/* Sessions here keep the name; Today's ✕ also offers to move them. */}
                    {v.user_id && <ConfirmDelete action={removeVenue.bind(null, v.id, "keep")} label={v.name} />}
                    {/* The admin can delete a shared venue added by mistake (two taps);
                        everyone's sessions there keep its name. */}
                    {!v.user_id && admin && <ConfirmDelete action={removeVenue.bind(null, v.id, "keep")} label={v.name} />}
                    {!v.user_id && !admin && (
                      <form action={hideVenue.bind(null, v.id)}>
                        <button type="submit" className="min-h-11 rounded-lg px-3 text-sm text-danger">
                          Hide
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
      {hidden.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">Hidden locations</h2>
          <p className="mb-2 text-sm text-muted">Shared locations you removed from your lists. They are still there for everyone else.</p>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {hidden.map((v) => (
              <li key={v.id} className="flex items-center gap-2 px-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{v.name}</span>
                  {v.region && <span className="block truncate text-xs text-muted">{v.region}</span>}
                </span>
                <form action={unhideVenue.bind(null, v.id)}>
                  <button type="submit" className="min-h-11 px-2 text-sm text-link underline">
                    Show again
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
