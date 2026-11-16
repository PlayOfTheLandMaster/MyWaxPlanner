import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { LocalTime } from "@/components/local-time";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { stageOf } from "@/lib/history/stage";
import { deleteSession } from "@/app/(app)/history/actions";
import { DeletePlanned } from "./delete-planned";

const NEXT: Record<string, string> = { wax: "Wax it", ski: "Ready to ski", rate: "Rate it" };

/**
 * Sessions under way for the skier picked on Today: planned and not yet
 * rated, with what comes next. Shown at the top of the Session tab.
 */
export async function ContinueList() {
  const supabase = await createClient();
  const who = await loadSkierContext();
  let q = supabase
    .from("wax_sessions")
    .select("id, occurred_at, technique, event_name, waxed_at, venue:venues (name)")
    .eq("status", "planned");
  q = who.current ? q.eq("skier_id", who.current.id) : q.is("skier_id", null);
  const { data } = await q.order("occurred_at", { ascending: false }).limit(5);
  const rows = (data ?? []).map((r) => ({
    id: r.id as string,
    occurred_at: r.occurred_at as string,
    technique: r.technique as "classic" | "skate",
    event_name: r.event_name as string | null,
    waxed_at: r.waxed_at as string | null,
    venue_name: (r.venue as unknown as { name: string } | null)?.name ?? null,
  }));
  if (rows.length === 0) return null;

  const now = new Date();
  return (
    <section aria-labelledby="continue-h" className="flex flex-col gap-2">
      <div>
        <h2 id="continue-h" className="text-lg font-semibold">
          Planned sessions
        </h2>
        <p className="text-sm text-muted">Planned and not yet rated. Tap one to wax, ski or rate it.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const stage = stageOf({ status: "planned", occurred_at: r.occurred_at, waxed_at: r.waxed_at }, now);
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
