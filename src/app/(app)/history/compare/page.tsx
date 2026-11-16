import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadSession, type Session } from "@/lib/history/load";
import { loadSkierContext } from "@/lib/skiers/current";
import { MAX_COMPARE, compareSections, parseCompareIds } from "@/lib/history/compare";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { LocalTime } from "@/components/local-time";
import { BackLink } from "@/components/nav-trail";
import { CompareTable } from "@/components/history/compare-table";
import { SkierBanner } from "@/components/skier-banner";

export const metadata: Metadata = { title: "Compare · My Wax Planner" };

// Two to four sessions side by side. With fewer than two chosen, the page is
// the picker: a plain form whose ticks become ?ids=…, so it needs no script.
export default function ComparePage({ searchParams }: PageProps<"/history/compare">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink fallback="/history" fallbackLabel="History" className="inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">Compare sessions</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Compare searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Compare({ searchParams }: { searchParams: PageProps<"/history/compare">["searchParams"] }) {
  const p = await searchParams;
  const { ids, tooMany } = parseCompareIds(p.ids);
  const supabase = await createClient();

  if (ids.length < 2 || p.pick === "1") return <Picker chosen={ids} />;

  const loaded = await Promise.all(ids.map((id) => loadSession(supabase, id)));
  const sessions = loaded.filter((s): s is Session => s !== null);
  if (sessions.length < 2) return <Picker chosen={sessions.map((s) => s.id)} note="Some of those sessions are no longer in your history." />;

  // Dates are drawn by LocalTime in the reader's zone, so the table carries the raw moment.
  const sections = compareSections(sessions, (iso) => iso, (await loadSkierContext()).me);
  const pickAgain = `/history/compare?${sessions.map((s) => `ids=${s.id}`).join("&")}&pick=1`;

  return (
    <div className="flex flex-col gap-4">
      {tooMany && <p className="text-sm text-muted">Up to {MAX_COMPARE} sessions fit side by side; these are the first {MAX_COMPARE}.</p>}
      <p className="flex flex-wrap items-center gap-x-4 text-sm">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-4 rounded-sm bg-tile shadow-[inset_4px_0_0_var(--accent)]" /> Rows where the sessions differ
        </span>
        <Link href={pickAgain} className="inline-flex min-h-11 items-center text-link underline">
          Change sessions
        </Link>
      </p>

      <CompareTable sessions={sessions} sections={sections} />
    </div>
  );
}

/** Tick two to four sessions. Sessions for the skier picked on Today, newest first. */
async function Picker({ chosen, note }: { chosen: string[]; note?: string }) {
  const supabase = await createClient();
  const who = await loadSkierContext();
  let q = supabase
    .from("wax_session_list")
    .select("id, occurred_at, status, technique, venue_name, event_name, snow_temp_c, glide_rating, grip_rating")
    .order("occurred_at", { ascending: false })
    .limit(60);
  if (who.skiers.length > 0) q = who.current ? q.eq("skier_id", who.current.id) : q.is("skier_id", null);
  const { data, error } = await q;
  if (error) return <p role="alert" className="text-sm text-danger">Could not read your history: {error.message}</p>;
  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <SkierBanner />
      {note && <p className="text-sm text-muted">{note}</p>}
      {rows.length < 2 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-muted">Compare needs at least two sessions. Log a few more and come back.</p>
      ) : (
        <form action="/history/compare" className="flex flex-col gap-3">
          <p className="text-sm text-muted">Tick 2 to {MAX_COMPARE} sessions.</p>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id as string}>
                <label className="flex min-h-11 items-start gap-3 rounded-xl border border-line bg-surface p-3 active:bg-tile">
                  <input type="checkbox" name="ids" value={r.id as string} defaultChecked={chosen.includes(r.id as string)} className="mt-1 size-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm text-muted">
                      <LocalTime iso={r.occurred_at as string} format="date" />
                      {r.status === "planned" ? " · Planned" : ""}
                    </span>
                    <span className="block truncate font-medium">
                      {(r.event_name as string | null) ?? (r.venue_name as string | null) ?? `${TECHNIQUE_LABELS[r.technique as "classic"]} session`}
                    </span>
                    <span className="block text-sm text-muted">
                      {[
                        TECHNIQUE_LABELS[r.technique as "classic"],
                        r.snow_temp_c !== null ? `Snow ${String(r.snow_temp_c).replace("-", "−")} °C` : null,
                        r.glide_rating ? `Glide ${r.glide_rating}` : null,
                        r.grip_rating ? `Grip ${r.grip_rating}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-page/90 py-2">
            <button type="submit" className="min-h-11 w-full rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70">
              Compare
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
