import { Suspense } from "react";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadFormOptions, loadSession } from "@/lib/history/load";
import { SessionForm, type SessionInitial } from "../session-form";
import { saveSession } from "../actions";

export const metadata: Metadata = { title: "Log a session · My Wax Planner" };

export default function NewSessionPage({ searchParams }: PageProps<"/history/new">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/history/new">["searchParams"] }) {
  const from = (await searchParams).from;
  const supabase = await createClient();
  const [options, source] = await Promise.all([
    loadFormOptions(supabase),
    typeof from === "string" ? loadSession(supabase, from) : Promise.resolve(null),
  ]);

  // "Repeat this prep": the same skis, layers and finish as a past session,
  // planned for now. Ratings, conditions and race details start empty.
  // Layers whose wax has left the box are kept, by name.
  const boxIds = new Set(options.waxes.map((w) => w.id));
  const initial: SessionInitial | undefined = source
    ? {
        occurred_at: new Date().toISOString(),
        status: "planned",
        technique: source.technique,
        ski_id: source.ski_id,
        mode: source.mode,
        venue_id: source.venue_id,
        event_name: null,
        event_distance_km: null,
        event_result: null,
        finish_notes: source.finish_notes,
        finish_tags: source.finish_tags,
        glide_rating: null,
        grip_rating: null,
        durability_rating: null,
        durability_km: null,
        durability_hours: null,
        kick_feel: null,
        notes: null,
        actual: null,
        layers: source.layers.map((l) => {
          const inBox = l.user_product_id !== null && boxIds.has(l.user_product_id);
          return {
            zone: l.zone,
            layer_role: l.layer_role ?? "",
            user_product_id: inBox ? (l.user_product_id as string) : "",
            custom_product: inBox
              ? ""
              : (l.custom_product ?? (l.product ? `${l.product.brand.name} ${l.product.name}` : "")),
            method: l.method ?? "",
            iron_temp_c: l.iron_temp_c === null ? "" : String(l.iron_temp_c),
            passes: l.passes === null ? "" : String(l.passes),
            scrape_brush_steps: l.scrape_brush_steps ?? "",
          };
        }),
      }
    : undefined;

  return (
    <>
      <div>
        <BackLink fallback={source ? `/history/${source.id}` : "/history"}>{source ? "✕ Cancel" : undefined}</BackLink>
        <h1 className="text-2xl font-bold">{source ? "Repeat a prep" : "Log a session"}</h1>
        {source && <p className="text-sm text-muted">Copied from a past session. Change anything before saving.</p>}
      </div>
      <SessionForm options={options} save={saveSession.bind(null, null)} initial={initial}
        submitLabel="Save session"
        cancelHref={source ? `/history/${source.id}` : "/history"}
      />
    </>
  );
}
