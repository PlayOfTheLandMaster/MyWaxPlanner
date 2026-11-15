import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadFormOptions, loadSession } from "@/lib/history/load";
import { SessionForm, type SessionInitial } from "../../session-form";
import { saveSession } from "../../actions";

export const metadata: Metadata = { title: "Edit session · My Wax Planner" };

export default function EditSessionPage({ params }: PageProps<"/history/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Edit params={params} />
      </Suspense>
    </main>
  );
}

async function Edit({ params }: { params: PageProps<"/history/[id]/edit">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const [session, options] = await Promise.all([loadSession(supabase, id), loadFormOptions(supabase)]);
  if (!session) notFound();

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
        <Link href={`/history/${id}`} className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Session
        </Link>
        <h1 className="text-2xl font-bold">Edit session</h1>
      </div>
      <SessionForm options={options} save={saveSession.bind(null, id)} initial={initial} submitLabel="Save changes" />
    </>
  );
}
