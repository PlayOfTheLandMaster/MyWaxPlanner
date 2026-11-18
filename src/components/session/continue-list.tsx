import type React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { LocalTime } from "@/components/local-time";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { stageOf } from "@/lib/history/stage";
import { deleteSession } from "@/app/(app)/history/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { markDone } from "@/app/(app)/session/actions";
import { splitByDay } from "@/lib/history/groups";
import { readerTimeZone } from "@/lib/reader-zone";

const NEXT: Record<string, string> = { wax: "Wax it", ski: "Ready to ski", rate: "Rate it" };

/**
 * Planned sessions for everyone the account waxes for, each named, at the
 * Sessions tab (a coach preps the whole squad's skis at once): "Current sessions" are today's and later ones; "Unrated sessions" are
 * from an earlier day, skied and never rated. "Today" is the reader's own
 * (lib/reader-zone), not the server's UTC.
 */
export async function ContinueList({ empty = null }: { empty?: React.ReactNode } = {}) {
  const supabase = await createClient();
  const who = await loadSkierContext();
  const q = supabase
    .from("wax_sessions")
    .select("id, occurred_at, technique, event_name, waxed_at, done_at, venue:venues (name), skier:skiers (name)")
    .eq("status", "planned");
  const { data } = await q.order("occurred_at", { ascending: false }).limit(60);
  const rows = (data ?? []).map((r) => ({
    id: r.id as string,
    occurred_at: r.occurred_at as string,
    technique: r.technique as "classic" | "skate",
    event_name: r.event_name as string | null,
    waxed_at: r.waxed_at as string | null,
    done_at: r.done_at as string | null,
    // Only worth saying when the account waxes for more than one person.
    skier_name: who.skiers.length > 0 ? ((r.skier as unknown as { name: string } | null)?.name ?? who.me) : null,
    venue_name: (r.venue as unknown as { name: string } | null)?.name ?? null,
  }));
  if (rows.length === 0) return empty;

  const now = new Date();
  const { current, unrated } = splitByDay(rows, now, await readerTimeZone());
  return (
    <>
      {current.length > 0 && (
        <Group id="current-h" title="Current sessions" note="Today's and coming up. Tap one to open it, or Done Skiing when it's skied." rows={current} now={now} offerDone />
      )}
      {unrated.length > 0 && (
        <Group id="unrated-h" title="Unrated sessions" note="From previous days and not yet rated. The ratings are used to build a history that is used to improve recommendations for future wax sessions." rows={unrated} now={now} />
      )}
    </>
  );
}

type Row = { id: string; occurred_at: string; technique: "classic" | "skate"; event_name: string | null; waxed_at: string | null; done_at: string | null; venue_name: string | null; skier_name: string | null };

function Group({ id, title, note, rows, now, offerDone = false }: { id: string; title: string; note: string; rows: Row[]; now: Date; offerDone?: boolean }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div>
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted">{note}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const stage = stageOf({ status: "planned", occurred_at: r.occurred_at, waxed_at: r.waxed_at, done_at: r.done_at }, now);
          return (
            <li
              key={r.id}
              // Coloured as on Today and the session page: blue while waxing or
              // skiing, green once skied and waiting for its rating. One
              // background class only (CLAUDE.md, Tailwind).
              className={`flex items-center gap-1 rounded-xl border border-l-8 border-line pr-2 ${stage === "rate" ? "border-l-done-edge bg-done" : "border-l-active-edge bg-active"}`}
            >
              <Link
                href={`/session/${r.id}${stage === "rate" ? "#rate" : ""}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-l-xl p-3 active:bg-tile"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.event_name ?? r.venue_name ?? `${TECHNIQUE_LABELS[r.technique]} session`}</span>
                  <span className="block text-sm text-muted">
                    {r.skier_name && <span className="font-medium text-ink">{r.skier_name} · </span>}
                    <LocalTime iso={r.occurred_at} />
                  </span>
                </span>
                <span className={`shrink-0 text-sm ${stage === "rate" ? "font-semibold text-link" : "text-muted"}`}>{NEXT[stage]} →</span>
              </Link>
              {/* One tap, no opening the session: a coach marks a dozen pairs in a row. */}
              {offerDone && (
                <form action={markDone.bind(null, r.id, "list")} className="shrink-0">
                  <button
                    type="submit"
                    aria-label={`Mark ${r.event_name ?? r.venue_name ?? "this session"} done skiing`}
                    className="min-h-11 rounded-lg border border-accent px-3 text-sm font-semibold text-link active:bg-tile"
                  >
                    Done Skiing
                  </button>
                </form>
              )}
              <ConfirmDelete
                action={deleteSession.bind(null, r.id, "/plan")}
                label={r.event_name ?? r.venue_name ?? "this planned session"}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
