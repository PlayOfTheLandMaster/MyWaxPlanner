import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSession } from "@/lib/history/load";
import { shareFilename, shareSummary, toShareInput } from "@/lib/history/share";
import { BackLink } from "@/components/nav-trail";
import { ShareActions } from "@/components/session/share-actions";
import { ShareDate } from "@/components/session/share-date";

export const metadata: Metadata = { title: "Share · My Wax Planner" };

// "Share a summary" from a finished session: the summary as the picture and
// the PDF will show it, with the notes left out unless the skier adds them.
// The skier's name and the skis are never shown (see lib/history/share.ts).
export default function SharePage({ params, searchParams }: PageProps<"/session/[id]/share">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6 print:max-w-none print:p-0">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Share params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Share({
  params,
  searchParams,
}: {
  params: PageProps<"/session/[id]/share">["params"];
  searchParams: PageProps<"/session/[id]/share">["searchParams"];
}) {
  const [{ id }, p] = await Promise.all([params, searchParams]);
  const withNotes = p.notes === "1";
  const supabase = await createClient();
  const s = await loadSession(supabase, id);
  if (!s) notFound();
  const input = toShareInput(s);
  // The date line is redrawn in the reader's own zone by ShareDate; UTC is only the first paint.
  const summary = shareSummary(input, { notes: withNotes, timeZone: "UTC" });
  const hasNotes = Boolean(s.notes?.trim() || s.finish_notes?.trim());

  return (
    <>
      <div className="flex flex-col gap-3 print:hidden">
        <BackLink
          fallback={`/session/${id}`}
          fallbackLabel="Session"
          className="inline-flex min-h-11 items-center self-start text-sm text-link underline"
        />
        <h1 className="text-2xl font-bold">Share a summary</h1>
        <p className="text-sm text-muted">Skier names and skis are never included.</p>
        {hasNotes && (
          <Link
            href={`/session/${id}/share${withNotes ? "" : "?notes=1"}`}
            replace
            scroll={false}
            role="checkbox"
            aria-checked={withNotes}
            className="flex min-h-11 items-center gap-3 self-start text-sm"
          >
            <span
              aria-hidden
              className={`flex size-6 items-center justify-center rounded border ${withNotes ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"}`}
            >
              {withNotes ? "✓" : ""}
            </span>
            Include my notes
          </Link>
        )}
        <ShareActions
          imageUrl={`/session/${id}/share/image${withNotes ? "?notes=1" : ""}`}
          filename={shareFilename(input, "UTC", "png")}
          title={summary.title}
        />
      </div>

      {/* The summary itself: what the PDF prints. */}
      <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface print:rounded-none print:border-0">
        <header className="flex flex-col gap-1 bg-[#1d4f91] px-5 py-5 text-white print:[print-color-adjust:exact]">
          <p className="text-sm tracking-wide uppercase opacity-85">{summary.kicker}</p>
          <h2 className="text-2xl font-bold">{summary.title}</h2>
          {summary.place && <p>{summary.place}</p>}
          <ShareDate iso={s.occurred_at} fallback={summary.date} />
          {summary.result && <p className="mt-1 text-lg font-bold">Result: {summary.result}</p>}
        </header>
        <div className="flex flex-col gap-5 px-5 py-5">
          {summary.conditions.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {summary.conditions.map((c) => (
                <li key={c} className="rounded-full bg-tile px-3 py-1 text-sm print:border print:border-line">
                  {c}
                </li>
              ))}
            </ul>
          )}
          {[
            { title: "Glide", rows: summary.glide },
            { title: "Grip", rows: summary.grip },
          ]
            .filter((z) => z.rows.length > 0)
            .map((z) => (
              <section key={z.title} className="flex flex-col gap-1">
                <h3 className="text-xs tracking-wide text-muted uppercase">{z.title}</h3>
                <ul className="flex flex-col gap-1">
                  {z.rows.map((r, i) => (
                    <li key={i}>
                      <span className="font-semibold">{r.wax}</span> <span className="text-sm text-muted">{r.role}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          {summary.ratings.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="text-xs tracking-wide text-muted uppercase">How it went</h3>
              <ul className="flex flex-col gap-0.5">
                {summary.ratings.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}
          {summary.notes && <p className="text-sm whitespace-pre-line text-muted">{summary.notes}</p>}
          <p className="self-end text-sm font-bold text-link">My Wax Planner</p>
        </div>
      </article>
    </>
  );
}

