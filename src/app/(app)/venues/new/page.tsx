import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ForecastError, searchPlaces } from "@/lib/weather/forecast";
import { VenueForm } from "../venue-form";

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
  const back = one(p.back) === "plan" ? "/plan" : "/venues";
  let results: Awaited<ReturnType<typeof searchPlaces>> = [];
  let error: string | null = null;
  if (q) {
    try {
      results = await searchPlaces(q);
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
  const base = back === "/plan" ? "&back=plan" : "";

  return (
    <>
      <div>
        <Link href={back} className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← {back === "/plan" ? "Plan" : "Venues"}
        </Link>
        <h1 className="text-2xl font-bold">Add a venue</h1>
        <p className="text-sm text-muted">Where you ski. Forecasts are fetched for the venue, wherever your phone is.</p>
      </div>

      <form method="get" className="flex gap-2">
        {back === "/plan" && <input type="hidden" name="back" value="plan" />}
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search a place, e.g. Lake Louise"
          aria-label="Search for a place"
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
        />
        <button type="submit" className="min-h-11 shrink-0 rounded-lg border border-line px-4 text-sm font-semibold">
          Search
        </button>
      </form>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {q && !error && results.length === 0 && (
        <p className="text-sm text-muted">
          No places found. Try the Nordic centre&apos;s full name (e.g. &ldquo;Sovereign Lake Nordic&rdquo;), the nearest town, or
          enter the position below.
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
                      {[r.kind, r.detail, r.elevation_m !== null ? `${r.elevation_m} m` : null].filter(Boolean).join(" · ")}
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
