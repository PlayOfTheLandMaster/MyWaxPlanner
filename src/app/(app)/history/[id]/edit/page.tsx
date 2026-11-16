import { Suspense } from "react";
import { BackLink } from "@/components/nav-trail";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadFormOptions, loadSession } from "@/lib/history/load";
import { formOwner, skisOf } from "@/lib/skis/owner";
import { SessionForm, type SessionInitial } from "../../session-form";
import { saveSession } from "../../actions";

export const metadata: Metadata = { title: "Edit session · My Wax Planner" };

export default function EditSessionPage({ params, searchParams }: PageProps<"/history/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Edit params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Edit({
  params,
  searchParams,
}: {
  params: PageProps<"/history/[id]/edit">["params"];
  searchParams: PageProps<"/history/[id]/edit">["searchParams"];
}) {
  const { id } = await params;
  // Arriving from "How did it go?" with something to correct.
  const thenRaw = (await searchParams).then;
  const then = (Array.isArray(thenRaw) ? thenRaw[0] : (thenRaw ?? "")).split(",");
  const fix = [then.includes("layers") ? "what went on the skis" : null, then.includes("conditions") ? "the actual conditions" : null].filter(
    Boolean,
  );
  const supabase = await createClient();
  const [session, allOptions] = await Promise.all([loadSession(supabase, id), loadFormOptions(supabase)]);
  if (!session) notFound();
  // Only the skis of the person this session is for.
  const options = { ...allOptions, skis: skisOf(allOptions.skis, formOwner(allOptions.skis, session, null)) };

  const initial: SessionInitial = {
    ...session,
    actual: session.actual,
    layers: session.layers.map((l) => ({
      zone: l.zone,
      layer_role: l.layer_role ?? "",
      user_product_id: l.user_product_id ?? "",
      // A wax that has left the box is shown by name, so the edit keeps it.
      custom_product:
        l.custom_product ?? (l.user_product_id ? "" : l.product ? `${l.product.brand.name} ${l.product.name}` : ""),
      method: l.method ?? "",
      iron_temp_c: l.iron_temp_c === null ? "" : String(l.iron_temp_c),
      passes: l.passes === null ? "" : String(l.passes),
      scrape_brush_steps: l.scrape_brush_steps ?? "",
    })),
  };

  return (
    <>
      <div>
        <BackLink fallback={`/history/${id}`} />
        <h1 className="text-2xl font-bold">Edit session</h1>
      </div>
      {fix.length > 0 && (
        <p role="status" className="rounded-lg border border-accent bg-tile p-3 text-sm">
          Ratings saved. Now correct {fix.join(" and ")} below, then Save changes.
        </p>
      )}
      <SessionForm options={options} save={saveSession.bind(null, id)} initial={initial} submitLabel="Save changes" cancelHref={`/history/${id}`} />
    </>
  );
}
