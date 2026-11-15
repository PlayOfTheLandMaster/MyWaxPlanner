import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { WaxBoxNav } from "@/components/wax-box-nav";
import { SKI_CATEGORY_LABELS, TECHNIQUE_LABELS, type SkiCategory, type Technique } from "@/lib/skis/input";

export const metadata: Metadata = { title: "Skis · My Wax Planner" };

type Ski = {
  id: string;
  name: string;
  technique: Technique;
  category: SkiCategory | null;
  brand: string | null;
  model: string | null;
  grind: string | null;
};

export default function SkisPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Wax box</h1>
      <WaxBoxNav current="skis" />
      <Link
        href="/wax-box/skis/new"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
      >
        Add skis
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <SkiList />
      </Suspense>
    </main>
  );
}

async function SkiList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skis")
    .select("id, name, technique, category, brand, model, grind")
    .order("technique")
    .order("name");
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not read your skis: {error.message}
      </p>
    );
  }
  const skis = (data ?? []) as Ski[];
  if (skis.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-4 text-muted">
        No skis yet. Add each pair you wax, so plans know their technique, grip type and grind.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {skis.map((s) => (
        <li key={s.id}>
          <Link
            href={`/wax-box/skis/${s.id}`}
            className="block rounded-xl border border-line bg-surface p-3 active:bg-tile"
          >
            <p className="truncate font-medium">{s.name}</p>
            <p className="truncate text-sm text-muted">
              {[
                TECHNIQUE_LABELS[s.technique],
                s.category ? SKI_CATEGORY_LABELS[s.category] : null,
                [s.brand, s.model].filter(Boolean).join(" ") || null,
                s.grind,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
