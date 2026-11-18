import { Suspense } from "react";
import Link from "next/link";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadFormOptions, loadSession } from "@/lib/history/load";
import { SessionForm, type SessionInitial } from "../session-form";
import { saveSession } from "../actions";
import { RecordForm } from "../record-form";
import { SkierBanner } from "@/components/skier-banner";
import { loadSkierContext } from "@/lib/skiers/current";
import { isExpert } from "@/lib/profile/style";
import { formOwner, skisOf } from "@/lib/skis/owner";
import { forecastable, loadVenues, type VenueRow } from "@/lib/venues/load";
import { loadTodayVenue } from "@/lib/venues/today-load";
import { loadSnowCheck } from "@/lib/snow/load";
import { recordBlocker, RECORD_BLOCKED } from "@/lib/snow/check";
import { forecastFor } from "@/lib/weather/window";
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
  const [allOptions, source, who, venues, today, snowCheck] = await Promise.all([
    loadFormOptions(supabase),
    typeof from === "string" ? loadSession(supabase, from) : Promise.resolve(null),
    loadSkierContext(),
    record ? loadVenues(supabase) : Promise.resolve([]),
    record ? loadTodayVenue(supabase) : Promise.resolve(null),
    record ? loadSnowCheck(supabase) : Promise.resolve(null),
  ]);
  const home = today?.id ?? null;
  // Only the skis of the person this session is for: the skier picked on
  // Today, or for "Repeat this prep" whoever the copied session was for.
  const owner = formOwner(allOptions.skis, source, who.current?.id ?? null);
  const options = { ...allOptions, skis: skisOf(allOptions.skis, owner) };

  // "Use this session data for today's wax job" (was Use this wax today, and Repeat this prep): the same skis, layers and finish as a past session,
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

  // Record a wax job starts only once Today has a location and Today's
  // Skiing Conditions for it (the owner's rule); Today holds its buttons back
  // too, and this covers a bookmark or a back button.
  const blocked = record ? recordBlocker(recordVenue?.id ?? null, snowCheck, today?.day ?? "") : null;
  if (blocked)
    return (
      <>
        <div>
          <BackLink fallback="/" />
          <h1 className="text-2xl font-bold">Record a wax job</h1>
        </div>
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <p>{RECORD_BLOCKED[blocked]}</p>
          <p className="text-sm text-muted">Every wax job today uses Today&apos;s location and its skiing conditions, so they come first.</p>
          <Link
            href="/"
            className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
          >
            Go to Today
          </Link>
        </section>
      </>
    );

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
        owner={owner}
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
        skiOwner={owner}
        draftName={`new:${owner ?? "me"}:${source?.id ?? "blank"}`}
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
  owner,
}: {
  options: FormOptions;
  initial: SessionInitial | undefined;
  source: { id: string } | null;
  venue: (VenueRow & { latitude: number; longitude: number }) | null;
  me: string;
  skierName: string | null;
  expert: boolean;
  /** Whose skis the form lists. */
  owner: string | null;
}) {
  // For the moment the form opens on, as the forecast saved with it will be.
  const forecast = venue ? await forecastFor(venue, { at: new Date().toISOString(), hours: 2 }) : null;

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
      {/* An expert sees the setting, and where to change it. A guided waxer
          sees nothing here: this form is for waxing already done, so pointing
          at suggestions (once "Or Start a wax session…") came too late. */}
      {expert && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 font-semibold">Expert mode</span>
          <Link href="/account" className="inline-flex min-h-11 items-center text-link underline">
            Change in Account
          </Link>
        </p>
      )}

      <RecordForm
        options={options}
        save={saveSession.bind(null, null)}
        initial={start}
        window={forecast?.window ?? null}
        error={forecast?.error ?? null}
        skiOwner={owner}
        draftName={`record:${owner ?? "me"}:${source?.id ?? "blank"}`}
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
