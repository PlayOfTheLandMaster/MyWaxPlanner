import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { LocalTime } from "@/components/local-time";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { stageOf } from "@/lib/history/stage";
import { deleteSession } from "@/app/(app)/history/actions";
import { DeletePlanned } from "./delete-planned";
import { splitByDay } from "@/lib/history/groups";
import { readerTimeZone } from "@/lib/reader-zone";

const NEXT: Record<string, string> = { wax: "Wax it", ski: "Ready to ski", rate: "Rate it" };

/**
 * Planned sessions for the skier picked on Today, at the top of the Session
 * tab: "Current sessions" are today's and later ones; "Unrated sessions" are
 * from an earlier day, skied and never rated. "Today" is the reader's own
 * (lib/reader-zone), not the server's UTC.
 */
export async function ContinueList() {
  const supabase = await createClient();
  const who = await loadSkierContext();
  let q = supabase
    .from("wax_sessions")
    .select("id, occurred_at, technique, event_name, waxed_at, done_at, venue:venues (name)")
    .eq("status", "planned");
  q = who.current ? q.eq("skier_id", who.current.id) : q.is("skier_id", null);
  const { data } = await q.order("occurred_at", { ascending: false }).limit(30);
  const rows = (data ?? []).map((r) => ({
    id: r.id as string,
    occurred_at: r.occurred_at as string,
    technique: r.technique as "classic" | "skate",
    event_name: r.event_name as string | null,
    waxed_at: r.waxed_at as string | null,
    done_at: r.done_at as string | null,
    venue_name: (r.venue as unknown as { name: string } | null)?.name ?? null,
  }));
  if (rows.length === 0) return null;

  const now = new Date();
  const { current, unrated } = splitByDay(rows, now, await readerTimeZone());
  return (
    <>
      {current.length > 0 && (
        <Group id="current-h" title="Current sessions" note="Today's and coming up. Tap one to wax, ski or rate it." rows={current} now={now} />
      )}
      {unrated.length > 0 && (
        <Group id="unrated-h" title="Unrated sessions" note="From an earlier day and not rated yet. Rate them, or delete the ones that never happened." rows={unrated} now={now} />
      )}
    </>
  );
}

type Row = { id: string; occurred_at: string; technique: "classic" | "skate"; event_name: string | null; waxed_at: string | null; done_at: string | null; venue_name: string | null };

function Group({ id, title, note, rows, now }: { id: string; title: string; note: string; rows: Row[]; now: Date }) {
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
              className={`flex items-center gap-1 rounded-xl border bg-surface pr-2 ${stage === "rate" ? "border-accent" : "border-line"}`}
            >
              <Link
                href={`/session/${r.id}${stage === "rate" ? "#rate" : ""}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-l-xl p-3 active:bg-tile"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.event_name ?? r.venue_name ?? `${TECHNIQUE_LABELS[r.technique]} session`}</span>
                  <span className="block text-sm text-muted">
                    <LocalTime iso={r.occurred_at} />
                  </span>
                </span>
                <span className={`shrink-0 text-sm ${stage === "rate" ? "font-semibold text-link" : "text-muted"}`}>{NEXT[stage]} →</span>
              </Link>
              <DeletePlanned
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
