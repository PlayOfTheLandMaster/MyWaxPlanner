import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { LocalTime } from "@/components/local-time";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { stageOf } from "@/lib/history/stage";

const NEXT: Record<string, string> = { wax: "Wax it", ski: "Out skiing", rate: "Rate it" };

/**
 * Sessions under way for the skier picked on Today: planned and not yet
 * rated, with what comes next. Shown at the top of the Session tab.
 */
export async function ContinueList() {
  const supabase = await createClient();
  const who = await loadSkierContext();
  let q = supabase
    .from("wax_session_list")
    .select("id, occurred_at, technique, venue_name, event_name")
    .eq("status", "planned");
  q = who.current ? q.eq("skier_id", who.current.id) : q.is("skier_id", null);
  const { data } = await q.order("occurred_at", { ascending: false }).limit(5);
  const rows = (data ?? []) as { id: string; occurred_at: string; technique: "classic" | "skate"; venue_name: string | null; event_name: string | null }[];
  if (rows.length === 0) return null;

  const now = new Date();
  return (
    <section aria-labelledby="continue-h" className="flex flex-col gap-2">
      <h2 id="continue-h" className="font-semibold">
        Continue
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const stage = stageOf({ status: "planned", occurred_at: r.occurred_at }, now);
          return (
            <li key={r.id}>
              <Link
                href={`/session/${r.id}${stage === "rate" ? "#rate" : ""}`}
                className={`flex items-center justify-between gap-3 rounded-xl border bg-surface p-3 active:bg-tile ${stage === "rate" ? "border-accent" : "border-line"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.event_name ?? r.venue_name ?? `${TECHNIQUE_LABELS[r.technique]} session`}</span>
                  <span className="block text-sm text-muted">
                    <LocalTime iso={r.occurred_at} />
                  </span>
                </span>
                <span className={`shrink-0 text-sm ${stage === "rate" ? "font-semibold text-link" : "text-muted"}`}>{NEXT[stage]} →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
