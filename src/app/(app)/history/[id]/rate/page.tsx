import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackLink } from "@/components/nav-trail";
import { createClient } from "@/lib/supabase/server";
import { loadSession } from "@/lib/history/load";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { ZONE_LABELS } from "@/lib/history/vocab";
import { LocalTime } from "@/components/local-time";
import { rateSession } from "../../actions";
import { RateForm } from "./rate-form";

export const metadata: Metadata = { title: "How did it go? · My Wax Planner" };

export default function RatePage({ params }: PageProps<"/history/[id]/rate">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Rate params={params} />
      </Suspense>
    </main>
  );
}

async function Rate({ params }: { params: PageProps<"/history/[id]/rate">["params"] }) {
  const { id } = await params;
  const s = await loadSession(await createClient(), id);
  if (!s) notFound();

  const name = (l: (typeof s.layers)[number]) =>
    l.product ? `${l.product.brand.name} ${l.product.name}` : (l.custom_product ?? "A wax");

  return (
    <>
      <div>
        <BackLink fallback={`/history/${id}`} />
        <h1 className="text-2xl font-bold">How did it go?</h1>
        <p className="text-muted">
          <LocalTime iso={s.occurred_at} format="date" /> ·{" "}
          {[s.event_name ?? s.venue?.name, TECHNIQUE_LABELS[s.technique], s.ski?.name].filter(Boolean).join(" · ")}
        </p>
      </div>

      {s.layers.length > 0 && (
        <details className="rounded-xl border border-line bg-surface">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium">
            What was planned ({s.layers.length} {s.layers.length === 1 ? "layer" : "layers"})
          </summary>
          <ul className="flex flex-col gap-1 px-4 pb-3 text-sm">
            {s.layers.map((l) => (
              <li key={l.id}>
                <span className="text-muted">{ZONE_LABELS[l.zone]}:</span> {name(l)}
              </li>
            ))}
          </ul>
        </details>
      )}

      <RateForm
        classic={s.technique === "classic"}
        hasLayers={s.layers.length > 0}
        askSnow={s.forecast !== null && s.actual === null}
        initialNotes={s.notes}
        save={rateSession.bind(null, id)}
      />
    </>
  );
}
