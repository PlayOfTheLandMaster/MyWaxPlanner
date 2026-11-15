import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";

export const metadata: Metadata = { title: "Plan · My Wax Planner" };

export default function PlanStepTwo({ params }: PageProps<"/plan/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Step params={params} />
      </Suspense>
    </main>
  );
}

const deg = (n: number | null) => (n === null ? "–" : `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C");

async function Step({ params }: { params: PageProps<"/plan/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: c, error } = await supabase
    .from("conditions")
    .select("id, observed_at, snow_temp_c, snow_temp_estimated, air_temp_c, air_rh_pct, snow_humidity_band, snow_type, venue:venues (name)")
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "22P02") throw new Error(`Could not read the conditions: ${error.message}`);
  if (!c) notFound();
  const venue = (c.venue as unknown as { name: string } | null)?.name;

  return (
    <>
      <div>
        <Link href="/plan" className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Change conditions
        </Link>
        <h1 className="text-2xl font-bold">Plan a wax</h1>
        <p className="text-sm text-muted">Step 2 of 2: your skis, and the recommendation.</p>
      </div>
      <section className="rounded-xl border border-line bg-surface p-4 text-sm">
        <p className="font-semibold">{venue ?? "Conditions"}</p>
        <p>
          Snow {deg(c.snow_temp_c)}
          {c.snow_temp_estimated ? " (estimate)" : ""} · air {deg(c.air_temp_c)} · {c.air_rh_pct ?? "–"} % humidity
        </p>
        <p className="text-muted">
          {[
            c.snow_type ? SNOW_TYPE_LABELS[c.snow_type as keyof typeof SNOW_TYPE_LABELS] : null,
            c.snow_humidity_band ? `${HUMIDITY_LABELS[c.snow_humidity_band as keyof typeof HUMIDITY_LABELS].toLowerCase()} snow` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>
      <p className="rounded-xl border border-line bg-surface p-4 text-muted">
        Conditions saved. Choosing skis and the RECOMMEND button arrive with build prompt 5.
      </p>
    </>
  );
}
