import { Suspense } from "react";
import Link from "next/link";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { ForecastError, searchPlaces } from "@/lib/weather/forecast";
import { VenueForm } from "../venue-form";
import { AreaFields } from "./area-fields";
import { SearchButton } from "./search-button";
import { countryCode, provinceName } from "@/lib/venues/search-area";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/learn/load";

export const metadata: Metadata = { title: "Add a venue · My Wax Planner" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export default function NewVenuePage({ searchParams }: PageProps<"/venues/new">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/venues/new">["searchParams"] }) {
  const p = await searchParams;
  const q = one(p.q)?.trim().slice(0, 80);
  const country = countryCode(one(p.country));
  const province = provinceName(one(p.province));
  // Where Add a venue was opened from: Plan a wax session, Today's Set location, or Venues.
  const from = one(p.back);
  const back = from === "plan" ? "/plan/start" : from === "today" ? "/" : "/venues";
  let results: Awaited<ReturnType<typeof searchPlaces>> = [];
  let error: string | null = null;
  if (q) {
    try {
      results = await searchPlaces(q, { country, province });
    } catch (e) {
      error = e instanceof ForecastError ? e.message : "The place search failed.";
    }
  }

  const prefill = {
    name: one(p.name),
    region: one(p.region),
    latitude: one(p.lat),
    longitude: one(p.lon),
    elevation_m: one(p.elev),
  };
  const base = back === "/plan/start" ? "&back=plan" : back === "/" ? "&back=today" : "";
  // The admin's venues go on the shared list (migration 20261215000000), so say so.
  const shared = await isAdmin(await createClient());

  return (
    <>
      <div>
        <BackLink fallback={back} fallbackLabel={back === "/plan/start" ? "Plan" : back === "/" ? "Today" : "Venues"} />
        <h1 className="text-2xl font-bold">Add a venue</h1>
        <p className="text-sm text-muted">Where you ski. Forecasts are fetched for the venue, wherever your phone is.</p>
        <p className="text-sm text-muted">
          {shared
            ? "As the admin, venues you add go on the shared list for every user."
            : "Venues you add are yours alone; other users don't see them."}
        </p>
      </div>

      <form method="get" className="flex flex-col gap-2">
        {back === "/plan/start" && <input type="hidden" name="back" value="plan" />}
        {back === "/" && <input type="hidden" name="back" value="today" />}
        <AreaFields country={country ?? ""} province={province ?? ""} />
        <div className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="A ski area, or the nearest town"
            aria-label="Search for a place"
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
          />
          <SearchButton />
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {q && !error && results.length === 0 && (
        <p className="text-sm text-muted">
          No places found{country || province ? " in that area" : ""}. Try the Nordic centre&apos;s full name (e.g. &ldquo;Sovereign
          Lake Nordic&rdquo;), the nearest town, Any for the area, or enter the position below.
        </p>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((r) => {
            const params = new URLSearchParams({
              name: r.name,
              region: r.detail,
              lat: String(r.latitude),
              lon: String(r.longitude),
              ...(r.elevation_m !== null ? { elev: String(r.elevation_m) } : {}),
            });
            return (
              <li key={`${r.latitude},${r.longitude}`}>
                <Link
                  href={`/venues/new?${params}${base}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 active:bg-tile"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {[r.kind, r.near ? `near ${r.near}` : null, r.detail, r.elevation_m !== null ? `${r.elevation_m} m` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-link">Use</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="rounded-xl border border-line bg-surface p-4">
        {/* Keyed by the chosen place so picking a search result refills the form. */}
        <VenueForm key={`${prefill.latitude},${prefill.longitude}`} prefill={prefill} back={back} />
      </section>
      <p className="text-xs text-muted">
        Place search: <a href="https://www.openstreetmap.org/copyright" className="underline">© OpenStreetMap contributors</a> and{" "}
        <a href="https://open-meteo.com/" className="underline">Open-Meteo</a> (GeoNames). Forecasts: Open-Meteo.
      </p>
    </>
  );
}
