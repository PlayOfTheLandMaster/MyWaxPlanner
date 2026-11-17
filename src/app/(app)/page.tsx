import { Suspense, cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { forecastable, loadHomeVenueId, loadVenues, type VenueRow } from "@/lib/venues/load";
import { forecastFor } from "@/lib/weather/window";
import { ForecastCard } from "@/components/forecast-card";
import { LocalTime } from "@/components/local-time";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { loadSkierContext } from "@/lib/skiers/current";
import { FALLBACK } from "@/lib/profile/name";
import { progress, setupSteps } from "@/lib/setup/steps";
import { SetupChecklist } from "@/components/setup-checklist";
import { isExpert } from "@/lib/profile/style";

export const metadata: Metadata = { title: "Today · My Wax Planner" };

// Today has one job: get the skier to "what goes on my skis today?" in as few
// taps as possible, then close the loop afterwards ("How did it go?").
// New accounts see a short getting-started checklist first.

const card = "rounded-xl border border-line bg-surface p-4";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export default function TodayPage({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Today</h1>
        <Link
          href="/account"
          aria-label="Account"
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface active:bg-tile"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
        </Link>
      </header>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Today searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Planned = {
  id: string;
  occurred_at: string;
  technique: "classic" | "skate";
  mode: "recreational" | "race";
  venue_name: string | null;
  event_name: string | null;
};

async function Today({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const p = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const who = await loadSkierContext();
  let plannedQuery = supabase
    .from("wax_session_list")
    .select("id, occurred_at, technique, mode, venue_name, event_name")
    .eq("status", "planned");
  plannedQuery = who.current ? plannedQuery.eq("skier_id", who.current.id) : plannedQuery.is("skier_id", null);
  const [venues, home, planned, skiCount, box, toolCount, recent, skierCount, theirSkis] = await Promise.all([
    loadVenues(supabase),
    loadHomeVenueId(supabase),
    plannedQuery.order("occurred_at", { ascending: true }).limit(20),
    supabase.from("skis").select("id", { count: "exact", head: true }),
    supabase.from("user_products").select("amount_left"),
    supabase.from("user_tools").select("id", { count: "exact", head: true }),
    supabase.from("wax_sessions").select("venue_id").not("venue_id", "is", null).order("occurred_at", { ascending: false }).limit(30),
    supabase.from("skiers").select("id", { count: "exact", head: true }),
    // Pairs belonging to whoever is picked: none means a plan for them has no skis to choose.
    (who.current
      ? supabase.from("skis").select("id", { count: "exact", head: true }).eq("skier_id", who.current.id)
      : supabase.from("skis").select("id", { count: "exact", head: true }).is("skier_id", null)),
  ]);

  const waxes = box.data ?? [];
  const low = waxes.filter((w) => w.amount_left === "low" || w.amount_left === "empty").length;
  const steps = setupSteps({ style: who.style, home: home !== null, skiers: skierCount.count ?? 0, skis: skiCount.count ?? 0, waxes: waxes.length, tools: toolCount.count ?? 0 });
  const { todo } = progress(steps);
  const expert = isExpert(who.style);

  // Venues for the chips: home first, then the ones you've skied most recently.
  const usable = venues.filter(forecastable);
  const recentIds = [...new Set((recent.data ?? []).map((r) => r.venue_id as string))];
  const chipVenues = [home, ...recentIds]
    .filter((id, i, all): id is string => !!id && all.indexOf(id) === i)
    .map((id) => usable.find((v) => v.id === id))
    .filter((v): v is VenueRow & { latitude: number; longitude: number } => !!v)
    .slice(0, 4);
  const venue = usable.find((v) => v.id === one(p.venue)) ?? chipVenues[0] ?? null;

  const rows = (planned.data ?? []) as Planned[];
  const upcoming = rows.find((r) => new Date(r.occurred_at) >= new Date(now.getTime() - 3 * 3600_000));
  // A planned session whose time has passed (by more than the session itself) is waiting for its ratings.
  const waiting = [...rows].reverse().find((r) => new Date(r.occurred_at) < new Date(now.getTime() - 3 * 3600_000));

  return (
    <>
      {who.me === FALLBACK && (
        // Accounts made before names were asked for: the app says "Me" until one is added.
        <Link href="/account" className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-accent bg-tile px-4 py-2 text-sm active:opacity-70">
          <span>Add your first name and last initial, so the app can name your skis and sessions.</span>
          <span aria-hidden className="text-link">→</span>
        </Link>
      )}
      {/* No skier picker on Today: the main button names the skier, and the
          screen it opens (Plan a wax, Record a wax job) has the picker. */}

      {/* The checklist covers the account's first pair; this is a skier
          picked later, with none of their own yet. */}
      {(skiCount.count ?? 0) > 0 && theirSkis.count === 0 && (
        <Link
          href={`/wax-box/skis/new?skier=${who.key}`}
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-accent bg-tile px-4 py-2 text-sm active:opacity-70"
        >
          <span>
            {who.current ? `${who.current.name} has no skis yet.` : "You have no skis of your own yet."}{" "}
            <span className="text-link underline">Add skis</span>
          </span>
          <span aria-hidden className="text-link">→</span>
        </Link>
      )}

      {todo > 0 && (
        <section className={card} aria-label="Getting started">
          <SetupChecklist steps={steps} next={steps.find((s) => !s.done)?.key} />
        </section>
      )}

      {expert ? (
        // An expert picks their own waxes: the main button records them, and
        // the app's suggestion stays one tap away underneath.
        <>
          <Link
            href={venue ? `/history/new?record=1&venue=${venue.id}` : "/history/new?record=1"}
            className="flex min-h-14 items-center justify-center rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70"
          >
            {who.current ? `Record a wax job for ${who.current.name}` : "Record a wax job"}
          </Link>
          <Link
            href={venue ? `/plan?venue=${venue.id}` : "/plan"}
            className="-mt-2 inline-flex min-h-11 items-center justify-center self-center text-sm text-link underline"
          >
            What would the app suggest?
          </Link>
        </>
      ) : (
        <>
          <Link
            href={venue ? `/plan?venue=${venue.id}` : "/plan"}
            className="flex min-h-14 items-center justify-center rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70"
          >
            {who.current ? `Plan a wax for ${who.current.name}` : "Plan a wax"}
          </Link>
          <Link
            href={venue ? `/history/new?record=1&venue=${venue.id}` : "/history/new?record=1"}
            className="-mt-2 inline-flex min-h-11 items-center justify-center self-center text-sm text-link underline"
          >
            Already waxed? Record a wax job
          </Link>
        </>
      )}

      {waiting && (
        <Link href={`/session/${waiting.id}#rate`} className={`${card} flex items-center justify-between gap-3 border-accent active:bg-tile`}>
          <span className="min-w-0">
            <span className="block font-semibold">How did it go?</span>
            <span className="block truncate text-sm text-muted">
              <LocalTime iso={waiting.occurred_at} format="date" /> · {waiting.event_name ?? waiting.venue_name ?? TECHNIQUE_LABELS[waiting.technique]} — rate it in a few taps
            </span>
          </span>
          <span aria-hidden className="text-muted">→</span>
        </Link>
      )}
      {upcoming && (
        <Link href={`/session/${upcoming.id}`} className={`${card} flex items-center justify-between gap-3 active:bg-tile`}>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Active Session In Progress</span>
            <span className="block truncate font-medium">
              <LocalTime iso={upcoming.occurred_at} /> · {upcoming.event_name ?? upcoming.venue_name ?? "Session"}
            </span>
            <span className="block text-sm text-muted">
              {TECHNIQUE_LABELS[upcoming.technique]}
              {upcoming.mode === "race" ? " race" : ""} · open the plan
            </span>
          </span>
          <span aria-hidden className="text-muted">→</span>
        </Link>
      )}

      {chipVenues.length > 1 && (
        <nav aria-label="Venue" className="flex flex-wrap gap-2">
          {chipVenues.map((v) => (
            <Link
              key={v.id}
              href={`/?venue=${v.id}`}
              aria-current={v.id === venue?.id ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${v.id === venue?.id ? "border-accent bg-tile font-semibold" : "border-line bg-surface"}`}
            >
              {v.id === home ? "⌂ " : ""}
              {v.name}
            </Link>
          ))}
        </nav>
      )}
      {venue ? (
        <Suspense fallback={<p className={`${card} text-muted`}>Loading the forecast for {venue.name}…</p>}>
          <Conditions venue={venue} />
        </Suspense>
      ) : (
        <p className={`${card} text-sm text-muted`}>
          <Link href="/venues" className="text-link underline">
            Pick a home venue
          </Link>{" "}
          to see its conditions here.
        </p>
      )}

      <nav aria-label="Shortcuts" className="grid grid-cols-3 gap-2">
        <Shortcut href="/history" title="History" detail="look back" />
        <Shortcut href="/wax-box" title="Wax box" detail={waxes.length ? `${waxes.length} waxes${low ? ` · ${low} low` : ""}` : "Empty"} warn={low > 0} />
        {/* Unassigned for now: "Similar to today" moved to History, above its
            filters. The slot keeps the row of three until it has a new job. */}
        <div
          aria-hidden
          className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-dashed border-line p-2 text-center text-sm text-muted"
        />
      </nav>
    </>
  );
}

function Shortcut({ href, title, detail, warn }: { href: string; title: string; detail?: string; warn?: boolean }) {
  return (
    <Link href={href} className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-line bg-surface p-2 text-center text-sm active:bg-tile">
      <span className="font-semibold">{title}</span>
      {detail && <span className={`text-xs ${warn ? "text-danger" : "text-muted"}`}>{detail}</span>}
    </Link>
  );
}

// One forecast request per venue per page.
const nextTwoHours = cache((venue: VenueRow) => forecastFor(venue, { hours: 2 }));

async function Conditions({ venue }: { venue: VenueRow }) {
  const result = await nextTwoHours(venue);
  if (!result.window) {
    return (
      <p role="alert" className={`${card} text-sm text-danger`}>
        {result.error}
      </p>
    );
  }
  return <ForecastCard w={result.window} compact />;
}
