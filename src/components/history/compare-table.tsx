import Link from "next/link";
import type { CompareSection } from "@/lib/history/compare";
import type { Session } from "@/lib/history/load";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { LocalTime } from "@/components/local-time";

/** The sessions as columns, the rows grouped by section; rows that differ are shaded and bold. */
export function CompareTable({
  sessions,
  sections,
}: {
  sessions: Pick<Session, "id" | "occurred_at" | "event_name" | "venue" | "technique">[];
  sections: CompareSection[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="sticky left-0 w-32 bg-surface p-3 text-left font-normal text-muted">
              <span className="sr-only">What</span>
            </th>
            {sessions.map((s) => (
              <th key={s.id} scope="col" className="p-3 text-left align-top">
                <Link href={`/history/${s.id}`} className="font-semibold text-link underline">
                  {s.event_name ?? s.venue?.name ?? `${TECHNIQUE_LABELS[s.technique as "classic"]} session`}
                </Link>
                <span className="block font-normal text-muted">
                  <LocalTime iso={s.occurred_at} format="date" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        {sections.map((sec) => (
          <tbody key={sec.title}>
            <tr>
              <th colSpan={sessions.length + 1} scope="colgroup" className="bg-tile px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                {sec.title}
              </th>
            </tr>
            {sec.rows.map((r) => (
              <tr key={r.label} className={`border-t border-line ${r.differs ? "bg-tile/60" : ""}`}>
                <th scope="row" className={`sticky left-0 p-3 text-left align-top font-medium ${r.differs ? "bg-tile shadow-[inset_4px_0_0_var(--accent)]" : "bg-surface"}`}>
                  {r.differs && <span className="sr-only">Differs: </span>}
                  {r.label}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={`p-3 align-top ${r.differs ? "font-semibold" : ""}`}>
                    {v === null ? <span className="text-muted">—</span> : r.label === "Date" ? <LocalTime iso={v} format="datetime" /> : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
