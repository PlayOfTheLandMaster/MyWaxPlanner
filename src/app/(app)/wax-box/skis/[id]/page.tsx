import { Suspense } from "react";
import { BackLink } from "@/components/nav-trail";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { SkiInput } from "@/lib/skis/input";
import { loadSkierContext } from "@/lib/skiers/current";
import { SkiForm } from "../ski-form";
import { deleteSki, updateSki } from "../actions";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Edit skis · My Wax Planner" };

export default function EditSkiPage({ params }: PageProps<"/wax-box/skis/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <BackLink fallback="/wax-box/skis" className="inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Edit params={params} />
      </Suspense>
    </main>
  );
}

async function Edit({ params }: { params: PageProps<"/wax-box/skis/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const { skiers, me } = await loadSkierContext();
  const { data, error } = await supabase
    .from("skis")
    .select("name, skier_id, technique, category, brand, model, base_material, grind, flex, grip_zone_cm, notes")
    .eq("id", id)
    .maybeSingle();
  // 22P02: not a uuid, which is just another way of not being found.
  if (error && error.code !== "22P02") throw new Error(`Could not read the skis: ${error.message}`);
  if (!data) notFound();
  const ski = data as SkiInput;

  return (
    <>
      <div className="flex items-center gap-3">
        <BrandLogo brand={ski.brand ?? null} size="size-12" />
        <h1 className="min-w-0 text-2xl font-bold">{ski.name}</h1>
      </div>
      <SkiForm save={updateSki.bind(null, id)} initial={ski} submitLabel="Save changes" skiers={skiers} me={me} />
      <details className="rounded-lg border border-line">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-danger">
          Delete these skis
        </summary>
        <form action={deleteSki.bind(null, id, "edit")} className="flex flex-col gap-2 p-3 pt-0">
          <p className="text-sm text-muted">
            Waxing sessions on these skis stay in your history; they just won&apos;t name a pair.
          </p>
          <button type="submit" className="min-h-11 rounded-lg bg-danger px-4 font-semibold text-on-accent active:opacity-70">
            Yes, delete them
          </button>
        </form>
      </details>
    </>
  );
}
