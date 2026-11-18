import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { loadInsightSessions } from "@/lib/history/insights-load";
import { ENOUGH, bestByBand, rated, spreads, usage, type Zone } from "@/lib/history/insights";
import { Legend, SpreadChart } from "@/components/history/spread-chart";
import { RATING_WORDS } from "@/lib/history/vocab";
import { temp } from "@/lib/history/share";
import { BackLink } from "@/components/nav-trail";
import { SkierBanner } from "@/components/skier-banner";

export const metadata: Metadata = { title: "Insights · My Wax Planner" };

// What the history says about each wax, for the skier picked on Today.
// Charts are plain SVG and HTML: three simple forms need no chart library.
export default function InsightsPage({ searchParams }: PageProps<"/history/insights">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink fallback="/history" fallbackLabel="History" className="inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">Insights</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Insights searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Insights({ searchParams }: { searchParams: PageProps<"/history/insights">["searchParams"] }) {
  const p = await searchParams;
  const supabase = await createClient();
  const who = await loadSkierContext();
  const skier = who.skiers.length > 0 ? who.key : undefined;
  const sessions = await loadInsightSessions(supabase, skier);

  const hasClassic = sessions.some((s) => s.technique === "classic" && s.waxes.some((w) => w.zone === "grip"));
  const zone: Zone = p.zone === "grip" && hasClassic ? "grip" : "glide";
  const word = zone === "glide" ? "glide" : "grip";
  const ratedCount = rated(sessions, zone).length;
  const spread = spreads(sessions, zone);
  const best = bestByBand(sessions, zone);
  const used = usage(sessions, zone);

  return (
    <div className="flex flex-col gap-6">
      <SkierBanner />
      {hasClassic && (
        <nav aria-label="Zone" className="flex gap-1 rounded-xl bg-tile p-1">
          {(["glide", "grip"] as const).map((z) => (
            <Link
              key={z}
              href={z === "glide" ? "/history/insights" : "/history/insights?zone=grip"}
              aria-current={zone === z ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm ${zone === z ? "bg-surface font-semibold shadow-sm" : "text-muted"}`}
            >
              {z === "glide" ? "Glide wax" : "Grip wax"}
            </Link>
          ))}
        </nav>
      )}

      {ratedCount < ENOUGH ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-muted">
          The charts need {ENOUGH} sessions rated for {word} with a snow temperature; you have {ratedCount}.{" "}
          {ENOUGH - ratedCount === 1 ? "One more" : `${ENOUGH - ratedCount} more`} and they appear here.
        </p>
      ) : (
        <>
          <section aria-labelledby="spread-h" className="flex flex-col gap-3">
            <div>
              <h2 id="spread-h" className="text-lg font-semibold">
                How each wax rated, by snow temperature
              </h2>
              <p className="text-sm text-muted">One dot per session, showing its {word} rating, 1 to 5.</p>
            </div>
            <Legend />
            <SpreadChart spread={spread} zone={zone} />
            <details className="rounded-xl border border-line bg-surface">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium">Show as a table</summary>
              <table className="mx-4 mb-4 w-[calc(100%-2rem)] text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-1 font-normal">Wax</th>
                    <th className="py-1 font-normal">Snow</th>
                    <th className="py-1 text-right font-normal">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {spread.flatMap((w) =>
                    w.points.map((pt) => (
                      <tr key={`${w.name}-${pt.session}`} className="border-t border-line">
                        <td className="py-1 pr-2">{w.name}</td>
                        <td className="py-1 pr-2 whitespace-nowrap">{temp(pt.temp)}</td>
                        <td className="py-1 text-right">{pt.rating}/5</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </details>
          </section>

          <section aria-labelledby="best-h" className="flex flex-col gap-3">
            <h2 id="best-h" className="text-lg font-semibold">
              Your best {word} wax for each snow temperature
            </h2>
            <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
              {best.map((b) => (
                <li key={b.band.key} className="flex items-baseline justify-between gap-3 p-3">
                  <span className="shrink-0 text-sm text-muted">{b.band.label}</span>
                  {b.name ? (
                    <span className="min-w-0 text-right">
                      <span className="font-semibold">{b.name}</span>
                      <span className="block text-sm text-muted">
                        {RATING_WORDS[Math.round(b.average)]} ({b.average}/5) · {b.sessions} {b.sessions === 1 ? "session" : "sessions"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted">No rated sessions yet</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {used.length > 0 && (
        <section aria-labelledby="used-h" className="flex flex-col gap-3">
          <h2 id="used-h" className="text-lg font-semibold">
            {zone === "glide" ? "Glide" : "Grip"} waxes you use most
          </h2>
          <ul className="flex flex-col gap-2">
            {used.map((u) => (
              <li key={u.name} className="flex flex-col gap-1">
                <span className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{u.name}</span>
                  <span className="shrink-0 text-muted tabular-nums">{u.sessions}</span>
                </span>
                <span aria-hidden className="block h-3 overflow-hidden rounded-full bg-tile">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(u.sessions / used[0].sessions) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sessions.length === 0 && (
        <p className="rounded-xl border border-line bg-surface p-4 text-muted">No finished sessions yet. Rate a few after skiing and this page fills in.</p>
      )}
    </div>
  );
}
