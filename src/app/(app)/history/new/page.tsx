import { Suspense } from "react";
import Link from "next/link";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadFormOptions, loadSession } from "@/lib/history/load";
import { SessionForm, type SessionInitial } from "../session-form";
import { saveSession } from "../actions";
import { SkierBanner } from "@/components/skier-banner";
import { loadSkierContext } from "@/lib/skiers/current";
import { isExpert } from "@/lib/profile/style";
import { formOwner, skisOf } from "@/lib/skis/owner";
import { forecastable, loadVenues, type VenueRow } from "@/lib/venues/load";
import { loadTodayVenue } from "@/lib/venues/today-load";
import { forecastFor } from "@/lib/weather/window";
import { encodeDraft } from "@/lib/plan/draft";
import { draftFromWindow } from "@/lib/history/record";
import { ForecastCard } from "@/components/forecast-card";
import { fold, foldHead } from "@/components/fold";
import { SKY_ICONS, SKY_LABELS } from "@/lib/history/vocab";
import { loadSnowCheck } from "@/lib/snow/load";
import type { FormOptions } from "@/lib/history/load";

export const metadata: Metadata = { title: "Record a wax job · My Wax Planner" };

export default function NewSessionPage({ searchParams }: PageProps<"/history/new">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/history/new">["searchParams"] }) {
  const sp = await searchParams;
  const from = sp.from;
  // "Record today's wax" (the expert's main button on Today): set to now, at
  // the venue Today showed, with its forecast saved alongside.
  const record = sp.record === "1";
  const supabase = await createClient();
  const [allOptions, source, who, venues, home] = await Promise.all([
    loadFormOptions(supabase),
    typeof from === "string" ? loadSession(supabase, from) : Promise.resolve(null),
    loadSkierContext(),
    record ? loadVenues(supabase) : Promise.resolve([]),
    record ? loadTodayVenue(supabase).then((t) => t.id) : Promise.resolve(null),
  ]);
  // Only the skis of the person this session is for: the skier picked on
  // Today, or for "Repeat this prep" whoever the copied session was for.
  const owner = formOwner(allOptions.skis, source, who.current?.id ?? null);
  const options = { ...allOptions, skis: skisOf(allOptions.skis, owner) };

  // "Use this wax today" (was Repeat this prep): the same skis, layers and finish as a past session,
  // planned for now. Ratings, conditions and race details start empty.
  // Layers whose wax has left the box are kept, by name.
  const boxIds = new Set(options.waxes.map((w) => w.id));
  // The venue Today showed, else today's location (set on Today, else home).
  const venueId = typeof sp.venue === "string" ? sp.venue : home;
  const recordVenue = record ? (venues.filter(forecastable).find((v) => v.id === venueId) ?? null) : null;
  const initial: SessionInitial | undefined = source
    ? {
        occurred_at: new Date().toISOString(),
        status: "planned",
        technique: source.technique,
        ski_id: source.ski_id,
        mode: source.mode,
        venue_id: source.venue_id,
        event_name: null,
        event_distance_km: null,
        event_result: null,
        finish_notes: source.finish_notes,
        finish_tags: source.finish_tags,
        glide_rating: null,
        grip_rating: null,
        durability_rating: null,
        durability_km: null,
        durability_hours: null,
        kick_feel: null,
        notes: null,
        actual: null,
        layers: source.layers.map((l) => {
          const inBox = l.user_product_id !== null && boxIds.has(l.user_product_id);
          return {
            zone: l.zone,
            layer_role: l.layer_role ?? "",
            user_product_id: inBox ? (l.user_product_id as string) : "",
            custom_product: inBox ? "" : (l.custom_product ?? (l.product ? `${l.product.brand.name} ${l.product.name}` : "")),
            method: l.method ?? "",
            iron_temp_c: l.iron_temp_c === null ? "" : String(l.iron_temp_c),
            passes: l.passes === null ? "" : String(l.passes),
            scrape_brush_steps: l.scrape_brush_steps ?? "",
          };
        }),
      }
    : undefined;

  if (record)
    return (
      <Record
        options={options}
        initial={initial}
        source={source}
        venue={recordVenue}
        me={who.me}
        skierName={who.current?.name ?? null}
        expert={isExpert(who.style)}
      />
    );

  return (
    <>
      <div>
        <BackLink fallback={source ? `/history/${source.id}` : "/history"}>{source ? "✕ Cancel" : undefined}</BackLink>
        <h1 className="text-2xl font-bold">{source ? "Repeat a prep" : "Record a wax job"}</h1>
        {source && <p className="text-sm text-muted">Copied from a past session. Change anything before saving.</p>}
      </div>
      {!source && <SkierBanner />}
      <SessionForm
        options={options}
        save={saveSession.bind(null, null)}
        initial={initial}
        submitLabel="Save session"
        cancelHref={source ? `/history/${source.id}` : "/history"}
      />
    </>
  );
}

/**
 * The expert's way in: the itemised form, set to now and the venue Today
 * showed, with the forecast saved alongside. Each one is new: there is no
 * "Use an earlier session" list here. A past session's own "Use this wax
 * today" still opens this form copied from it (?from=).
 */
async function Record({
  options,
  initial,
  source,
  venue,
  skierName,
  expert,
}: {
  options: FormOptions;
  initial: SessionInitial | undefined;
  source: { id: string } | null;
  venue: (VenueRow & { latitude: number; longitude: number }) | null;
  me: string;
  skierName: string | null;
  expert: boolean;
}) {
  const supabase = await createClient();
  const [forecast, snowCheck] = await Promise.all([
    venue ? forecastFor(venue, { hours: 2 }) : Promise.resolve(null),
    loadSnowCheck(supabase),
  ]);
  const w = forecast?.window ?? null;

  // A copy keeps its skis, layers and finish, but is for now and here.
  const start: SessionInitial | undefined = initial
    ? {
        ...initial,
        occurred_at: new Date().toISOString(),
        venue_id: venue?.id ?? initial.venue_id,
      }
    : venue
      ? blankAt(venue.id)
      : undefined;

  return (
    <>
      <div>
        <BackLink fallback="/">{source ? "✕ Cancel" : undefined}</BackLink>
        <h1 className="text-2xl font-bold">{skierName ? `Record a wax job for ${skierName}` : "Record a wax job"}</h1>
        <p className="text-sm text-muted">
          {source
            ? "Copied from an earlier session. Change anything before saving."
            : "Enter the waxes you applied. Rate the job after skiing. The app doesn't suggest waxes here."}
        </p>
      </div>
      {/* Under the title and its note: who this wax job is for. */}
      <SkierBanner />
      {/* The note under the title says the app suggests nothing here; this
          names the setting for an expert, and points a guided waxer at the
          way in that does suggest. A quiet pill, like the skier line. */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {expert && (
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 font-semibold">Expert mode</span>
        )}
        {expert ? (
          <Link href="/account" className="inline-flex min-h-11 items-center text-link underline">
            Change in Account
          </Link>
        ) : (
          <Link href={venue ? `/plan?venue=${venue.id}` : "/plan"} className="inline-flex min-h-11 items-center text-base text-link underline">
            Or Plan a wax session if you want suggestions
          </Link>
        )}
      </p>


      {w ? (
        // Folded to one line: the sky and air temperature; opens on the forecast saved with the session.
        <details className={fold}>
          <summary className={foldHead}>
            <span aria-hidden className="text-2xl leading-none">
              {SKY_ICONS[w.sky]}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">Forecast at time of session</span>
              <span className="block truncate text-sm text-muted">
                {`${w.air_temp_c > 0 ? "+" : ""}${w.air_temp_c}`.replace("-", "−")} °C · {SKY_LABELS[w.sky]} · {w.venue.name}
              </span>
            </span>
          </summary>
          <ForecastCard w={w} compact bare />
          <p className="px-4 pb-4 text-xs text-muted">Saved with the session. Record what the snow was really like when you rate it.</p>
        </details>
      ) : forecast?.error ? (
        <p className="text-sm text-muted">No forecast to save: {forecast.error}</p>
      ) : null}

      <SessionForm
        options={options}
        save={saveSession.bind(null, null)}
        initial={start}
        submitLabel="Save"
        cancelHref="/"
        hidden={w ? { forecast: encodeDraft(draftFromWindow(w, snowCheck)) } : undefined}
      />
    </>
  );
}

/** A fresh session for now at a venue, nothing else chosen. */
function blankAt(venueId: string): SessionInitial {
  return {
    occurred_at: new Date().toISOString(),
    status: "planned",
    technique: "",
    ski_id: null,
    mode: "recreational",
    venue_id: venueId,
    event_name: null,
    event_distance_km: null,
    event_result: null,
    finish_notes: null,
    finish_tags: [],
    glide_rating: null,
    grip_rating: null,
    durability_rating: null,
    durability_km: null,
    durability_hours: null,
    kick_feel: null,
    notes: null,
    actual: null,
    layers: [],
  };
}
